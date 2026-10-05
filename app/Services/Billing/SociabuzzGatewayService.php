<?php

namespace Pterodactyl\Services\Billing;

use Illuminate\Support\Facades\Http;
use Pterodactyl\Exceptions\DisplayException;

/**
 * Client untuk Sociabuzz Payment Gateway via Maelyn API.
 *
 * Port 1:1 dari .docs/sociabuzz.js. Kontrak:
 * - Create: POST {base}/create/payment, header x-maelyn-auth, body
 *   {username, amount, fullname, email, note, currency} ->
 *   payment: {order_id, inv_id, amount, qr_string, expiration_date,
 *   expired_at, redirect_url}.
 * - Status: TIDAK ADA webhook. Satu-satunya cara = scrape <title>
 *   halaman redirect_url: "Choose payment method" = PENDING,
 *   "Payment successful" = PAID, "Link expired" = EXPIRED.
 */
class SociabuzzGatewayService
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_UNKNOWN = 'unknown';

    /**
     * Buat payment baru di gateway.
     *
     * @return array{order_id: string, inv_id: string, amount: int|string, qr_string: string, expiration_date: string, expired_at: string, redirect_url: string}
     *
     * @throws DisplayException
     */
    public function createPayment(int $amount, string $fullname, string $email, string $note = 'Pembayaran', string $currency = 'IDR'): array
    {
        $apiKey = config('billing.maelyn_api_key');
        if (empty($apiKey)) {
            throw new DisplayException('MAELYN_API_KEY belum diset di environment variables.');
        }

        if ($amount <= 0) {
            throw new DisplayException('amount harus lebih dari 0.');
        }

        if (empty($fullname)) {
            throw new DisplayException('fullname wajib diisi.');
        }

        if (empty($email)) {
            throw new DisplayException('email wajib diisi.');
        }

        $response = Http::acceptJson()
            ->withOptions($this->sslOptions())
            ->withHeaders(['x-maelyn-auth' => $apiKey])
            ->post(rtrim(config('billing.maelyn_base_url'), '/') . '/create/payment', [
                'username' => config('billing.sociabuzz_username'),
                'amount' => (string) $amount,
                'fullname' => $fullname,
                'email' => $email,
                'note' => $note,
                'currency' => $currency,
            ]);

        $data = $response->json() ?? [];

        if (!$response->successful() || empty($data['success'])) {
            throw new DisplayException(sprintf(
                '[SociaBuzz] Create payment gagal (%s): %s',
                $response->status(),
                json_encode($data)
            ));
        }

        if (empty($data['payment']['redirect_url']) || empty($data['payment']['order_id'])) {
            throw new DisplayException('[SociaBuzz] Response tidak memiliki redirect_url atau order_id.');
        }

        return $data['payment'];
    }

    /**
     * Cek status pembayaran dengan scraping <title> dari redirect_url.
     *
     * @return self::STATUS_* string
     *
     * @throws DisplayException
     */
    public function checkPaymentStatus(string $redirectUrl): string
    {
        if (empty($redirectUrl)) {
            throw new DisplayException('redirectUrl wajib diisi.');
        }

        $response = Http::withOptions($this->sslOptions())->withHeaders([
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language' => 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        ])->get($redirectUrl);

        $html = $response->body() ?? '';

        $title = '';
        if (preg_match('/<title[^>]*>([^<]*)<\/title>/i', $html, $matches)) {
            $title = trim($matches[1]);
        }

        $lowerTitle = strtolower($title);
        if (str_contains($lowerTitle, 'payment successful')) {
            return self::STATUS_PAID;
        }
        if (str_contains($lowerTitle, 'link expired')) {
            return self::STATUS_EXPIRED;
        }
        if (str_contains($lowerTitle, 'choose payment method')) {
            return self::STATUS_PENDING;
        }

        // Fallback: cek berdasarkan konten halaman (hanya keyword spesifik, bukan substring generik "expired").
        $lowerHtml = strtolower($html);
        if (str_contains($lowerHtml, 'payment successful')) {
            return self::STATUS_PAID;
        }
        if (str_contains($lowerHtml, 'link expired')) {
            return self::STATUS_EXPIRED;
        }

        return self::STATUS_UNKNOWN;
    }

    /**
     * Parse amount dari string format ribuan ke integer bersih.
     * Contoh: "10.000" -> 10000, "10,000" -> 10000.
     */
    public static function parseAmount(string|int $value): int
    {
        return (int) preg_replace('/[.,]/', '', (string) $value) ?: 0;
    }

    /**
     * Parse tanggal expiry dari gateway secara defensif.
     *
     * Format gateway tidak dijamin ISO-8601 (bisa "2026-10-04 01:30:00",
     * unix ms, atau string kosong). Carbon::parse() melempar
     * InvalidFormatException (subclass UnexpectedValueException) yang
     * bocor jadi 500. Di sini gagal parse -> null, dan job verifikasi
     * tetap jalan lewat fallback cek status gateway.
     *
     * @param  mixed  $value
     */
    public static function parseExpiry($value): ?\Illuminate\Support\Carbon
    {
        if (empty($value)) {
            return null;
        }

        // Unix timestamp detik / milidetik.
        if (is_numeric($value)) {
            $seconds = (int) $value;
            if ($seconds > 100000000000) {
                $seconds = (int) floor($seconds / 1000);
            }

            return \Illuminate\Support\Carbon::createFromTimestamp($seconds);
        }

        try {
            return \Illuminate\Support\Carbon::parse((string) $value);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Billing: gagal parse expiration_date gateway', [
                'value' => $value,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
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
