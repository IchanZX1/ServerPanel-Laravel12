<?php

namespace Pterodactyl\Services\Billing;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Exceptions\DisplayException;

/**
 * Client untuk Pakasir Payment Gateway (API v2).
 *
 * Kontrak (lihat .docs/pakasir.txt):
 * - Create: POST {base}/api/v2/create-transaction/{slug}/{order_id},
 *   header X-Api-Key, body {method, amount} -> {txn_id, project, order_id,
 *   amount, fee, total_payment, payment_method, qr_string, va_number,
 *   expired_at, is_sandbox}.
 * - Status: GET {base}/api/v2/transaction-status/{slug}/{txn_id}, header
 *   X-Api-Key -> {txn_id, order_id, amount, is_sandbox, status,
 *   completed_at}. Status: pending | completed | canceled.
 * - Webhook: POST ke URL terdaftar saat pembayaran berhasil, header
 *   X-Secret, body sama dengan respons status.
 *
 * Dua sifat API yang membentuk cara pemakaian di panel:
 * - Create bersifat find-or-create: parameter + body identik selalu
 *   mengembalikan respons yang sama. Karena itu order_id wajib unik dan
 *   tidak pernah dipakai ulang untuk nominal berbeda.
 * - Rate limit: create 2 req/detik, status 1 req per 4 detik per transaksi.
 *   Polling scheduler per menit aman; jangan dirapatkan.
 *
 * `amount` yang dikirim adalah pendapatan merchant. Pembeli membayar
 * amount + fee, dan nominal itu yang di-encode ke `qr_string` sebagai
 * `total_payment`.
 */
class PakasirGatewayService
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_UNKNOWN = 'unknown';

    /**
     * Batas nominal QRIS menurut .docs/pakasir.txt. Di luar rentang ini Pakasir
     * menolak, jadi lebih baik gagal di sini dengan pesan yang menyebut harga
     * paket daripada meneruskan error mentah gateway ke user.
     */
    public const QRIS_MIN_AMOUNT = 500;
    public const QRIS_MAX_AMOUNT = 10000000;

    /**
     * Buat transaksi QRIS baru.
     *
     * Idempoten di sisi Pakasir: order_id + amount yang sama menghasilkan
     * respons yang sama, jadi request ulang tidak membuat transaksi ganda.
     *
     * @return array{txn_id: string, qr_string: string, expired_at: mixed, total_payment: int|null, fee: int|null, is_sandbox: bool|null}
     *
     * @throws DisplayException
     */
    public function createQrisTransaction(int $amount, string $orderId): array
    {
        if ($amount <= 0) {
            throw new DisplayException('Nominal transaksi harus lebih dari 0.');
        }

        if ($amount < self::QRIS_MIN_AMOUNT || $amount > self::QRIS_MAX_AMOUNT) {
            throw new DisplayException(sprintf(
                'Harga paket Rp %s di luar batas QRIS (Rp %s - Rp %s). Perbaiki harga paket di admin.',
                number_format($amount, 0, ',', '.'),
                number_format(self::QRIS_MIN_AMOUNT, 0, ',', '.'),
                number_format(self::QRIS_MAX_AMOUNT, 0, ',', '.'),
            ));
        }

        if (empty(trim($orderId))) {
            throw new DisplayException('order_id wajib diisi.');
        }

        $response = Http::acceptJson()
            ->withOptions($this->sslOptions())
            ->withHeaders($this->headers())
            ->post($this->endpoint('create-transaction', $orderId), [
                'method' => 'qris',
                'amount' => $amount,
            ]);

        $data = $response->json() ?? [];

        if (!$response->successful()) {
            throw new DisplayException(sprintf(
                '[Pakasir] Create transaction gagal (%s): %s',
                $response->status(),
                json_encode($data)
            ));
        }

        // qr_string wajib: tanpa itu halaman invoice tidak bisa menampilkan
        // apa pun yang bisa dibayar, jadi lebih baik gagal di sini daripada
        // membuat invoice yang tidak bisa diselesaikan.
        if (empty($data['txn_id']) || empty($data['qr_string'])) {
            throw new DisplayException(sprintf(
                '[Pakasir] Response tidak memiliki txn_id atau qr_string: %s',
                json_encode($data)
            ));
        }

        // expired_at hilang berarti paymentDeadline() jatuh ke fallback
        // invoice_lifetime_minutes (3 menit), sementara QR di Pakasir tetap
        // bisa dibayar jauh lebih lama. Catat supaya ketidakcocokan ini terlihat,
        // bukan silent.
        if (empty($data['expired_at'])) {
            Log::warning('Billing: create-transaction tanpa expired_at', [
                'order_id' => $orderId,
                'txn_id' => $data['txn_id'],
            ]);
        }

        // Proyek sandbox di production = tidak ada uang yang benar-benar masuk.
        if (($data['is_sandbox'] ?? false) === true && app()->isProduction()) {
            Log::warning('Billing: transaksi Pakasir berjalan di SANDBOX', [
                'order_id' => $orderId,
                'txn_id' => $data['txn_id'],
            ]);
        }

        return [
            'txn_id' => (string) $data['txn_id'],
            'qr_string' => (string) $data['qr_string'],
            'expired_at' => $data['expired_at'] ?? null,
            'total_payment' => isset($data['total_payment']) ? (int) $data['total_payment'] : null,
            'fee' => isset($data['fee']) ? (int) $data['fee'] : null,
            'is_sandbox' => $data['is_sandbox'] ?? null,
        ];
    }

    /**
     * Cek status transaksi via API (sumber otoritatif, bukan scraping).
     *
     * @return self::STATUS_* string
     *
     * @throws DisplayException
     */
    public function checkTransactionStatus(string $txnId): string
    {
        if (empty(trim($txnId))) {
            throw new DisplayException('txn_id wajib diisi untuk mengecek status.');
        }

        $response = Http::acceptJson()
            ->withOptions($this->sslOptions())
            ->withHeaders($this->headers())
            ->get($this->endpoint('transaction-status/' . rawurlencode($txnId)));

        if (!$response->successful()) {
            throw new DisplayException(sprintf(
                '[Pakasir] Cek status gagal (%s): %s',
                $response->status(),
                json_encode($response->json() ?? [])
            ));
        }

        $status = strtolower((string) ($response->json('status') ?? ''));

        return match ($status) {
            'completed' => self::STATUS_PAID,
            'canceled' => self::STATUS_EXPIRED,
            'pending' => self::STATUS_PENDING,
            default => self::STATUS_UNKNOWN,
        };
    }

    /**
     * Parse tanggal expired dari gateway secara defensif.
     *
     * Pakasir mengirim RFC3339 dengan pecahan detik 9 digit
     * ("2025-09-19T01:18:49.678622564Z"). Carbon di PHP 8.4 sudah menerima
     * presisi itu native; pecahan sub-detik dibuang, yang tidak masalah untuk
     * batas pembayaran berpresisi menit.
     *
     * Jebakan yang harus dijaga: Carbon::parse('') dan Carbon::parse('  ')
     * TIDAK melempar exception — keduanya mengembalikan now(). Kalau nilai
     * kosong/whitespace lolos ke sini, gateway_expires_at jadi "sekarang" dan
     * invoice langsung di-expire pada poll berikutnya, tanpa error dan tanpa
     * log. Karena itu guard di bawah memakai trim(), bukan empty() — empty()
     * mengembalikan false untuk string berisi spasi.
     *
     * Gagal parse -> null. Pemanggil tetap punya fallback
     * (paymentDeadline() memakai created_at + invoice_lifetime_minutes).
     *
     * @param  mixed  $value
     */
    public static function parseExpiry($value): ?Carbon
    {
        if (is_null($value)) {
            return null;
        }

        // Unix timestamp detik / milidetik.
        if (is_numeric($value)) {
            $seconds = (int) $value;
            if ($seconds > 100000000000) {
                $seconds = (int) floor($seconds / 1000);
            }

            return Carbon::createFromTimestamp($seconds);
        }

        if (!is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse(trim($value));
        } catch (\Throwable $e) {
            Log::warning('Billing: gagal parse expired_at gateway', [
                'value' => $value,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Header autentikasi. API key kosong dicek di sini supaya pesan errornya
     * menyebut kunci mana yang belum diset.
     *
     * @throws DisplayException
     */
    protected function headers(): array
    {
        $apiKey = (string) config('billing.pakasir.api_key');

        if (empty($apiKey)) {
            throw new DisplayException('PAKASIR_API_KEY belum diset di environment variables.');
        }

        return ['X-Api-Key' => $apiKey];
    }

    /**
     * Bangun URL endpoint. Urutan segmennya /{path}/{slug}/{suffix} — slug
     * proyek selalu di tengah, jadi juga divalidasi di sini.
     *
     * @throws DisplayException
     */
    protected function endpoint(string $path, string $suffix = ''): string
    {
        $slug = (string) config('billing.pakasir.slug');

        if (empty($slug)) {
            throw new DisplayException('PAKASIR_SLUG belum diset di environment variables.');
        }

        $url = rtrim((string) config('billing.pakasir.base_url'), '/')
            . '/api/v2/' . $path
            . '/' . rawurlencode($slug);

        if ($suffix !== '') {
            $url .= '/' . rawurlencode($suffix);
        }

        return $url;
    }

    /**
     * Opsi SSL untuk request gateway.
     *
     * Di Windows, antivirus (Avast Web Shield) meng-intercept TLS dan
     * mengganti sertifikat dengan root CA-nya sendiri, sehingga cURL gagal
     * dengan error 60 "unable to get local issuer certificate". Verifikasi
     * di-bypass HANYA saat development (APP_ENV != production).
     */
    protected function sslOptions(): array
    {
        if (app()->isProduction() || !config('billing.ssl_verify_disabled')) {
            return [];
        }

        return [
            'verify' => false,
        ];
    }
}
