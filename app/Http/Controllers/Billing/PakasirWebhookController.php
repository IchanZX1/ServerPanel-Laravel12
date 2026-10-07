<?php

namespace Pterodactyl\Http\Controllers\Billing;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Jobs\Billing\MarkInvoicePaidJob;
use Pterodactyl\Models\Billing\BillingInvoice;
use Pterodactyl\Services\Billing\PakasirGatewayService;

/**
 * Webhook pembayaran Pakasir.
 *
 * Pakasir mengirim POST saat transaksi berhasil, dengan header X-Secret.
 * Endpoint ini publik, tanpa session, dan tanpa CSRF — autentikasinya murni
 * dari header itu. Lihat pendaftarannya di RouteServiceProvider.
 *
 * Aturan respons yang penting: kembalikan 200 untuk semua hal yang sudah
 * "selesai diproses" — termasuk order yang tidak dikenal dan pengiriman ulang —
 * supaya Pakasir berhenti mengulang. Kembalikan 401 hanya untuk secret yang
 * salah, dan JANGAN kembalikan 5xx: retry yang datang saat gateway kita sendiri
 * sedang bermasalah hanya mengulang masalah yang sama.
 */
class PakasirWebhookController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        if (!$this->secretIsValid($request)) {
            Log::warning('Billing: webhook Pakasir dengan secret tidak valid', ['ip' => $request->ip()]);

            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $orderId = (string) $request->input('order_id', '');
        $txnId = (string) $request->input('txn_id', '');

        if ($orderId === '' || $txnId === '') {
            Log::warning('Billing: webhook Pakasir tanpa order_id/txn_id', [
                'body' => $request->all(),
            ]);

            return response()->json(['message' => 'OK']);
        }

        $invoice = BillingInvoice::query()->where('order_id', $orderId)->first();

        if (is_null($invoice)) {
            // Bukan transaksi kita (mis. proyek lain di akun yang sama, atau
            // sisa uji sandbox). Tidak ada yang perlu dilakukan dan tidak ada
            // gunanya Pakasir mengulang.
            Log::warning('Billing: webhook Pakasir untuk order_id tidak dikenal', [
                'order_id' => $orderId,
                'txn_id' => $txnId,
            ]);

            return response()->json(['message' => 'OK']);
        }

        if (!is_null($invoice->inv_id) && !hash_equals((string) $invoice->inv_id, $txnId)) {
            Log::warning('Billing: webhook Pakasir txn_id tidak cocok dengan invoice', [
                'invoice_id' => $invoice->id,
                'order_id' => $orderId,
                'expected_txn_id' => $invoice->inv_id,
                'received_txn_id' => $txnId,
            ]);

            return response()->json(['message' => 'OK']);
        }

        // Already fulfilled — pengiriman ulang, atau poller yang menang balapan.
        if ($invoice->status === BillingInvoice::STATUS_PAID) {
            return response()->json(['message' => 'OK']);
        }

        try {
            // Body TIDAK dipercaya. Secret bisa bocor dan body bisa dipalsukan,
            // jadi status otoritatif diambil dari API. Satu panggilan tambahan
            // per pembayaran, dan hasilnya membuat jalur webhook dan jalur poll
            // berakhir di keputusan yang identik.
            $status = app()->make(PakasirGatewayService::class)->checkTransactionStatus($txnId);
        } catch (\Throwable $e) {
            Log::warning('Billing: webhook Pakasir gagal verifikasi ke API', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
            ]);

            // 200, bukan 5xx: scheduler `billing:verify-pending` akan mengambil
            // alih pada menit berikutnya.
            return response()->json(['message' => 'OK']);
        }

        if ($status === PakasirGatewayService::STATUS_PAID) {
            // SENGAJA tanpa syarat status lokal: invoice yang sudah kita tandai
            // EXPIRED lokal tetap harus dipenuhi kalau gateway memastikan
            // transaksinya lunas. Menolak di sini berarti uang diambil tanpa
            // server yang dibuat.
            $invoice->update(['status' => BillingInvoice::STATUS_PAID, 'paid_at' => $invoice->paid_at ?? now()]);

            // dispatchSync, bukan dispatch()->onQueue(): tanpa queue worker,
            // dispatch biasa hanya menumpuk di tabel jobs dan server tidak
            // pernah terbuat. Sama seperti jalur verifikasi lain.
            MarkInvoicePaidJob::dispatchSync($invoice);

            Log::info('Billing: invoice dibayar via webhook Pakasir', [
                'invoice_id' => $invoice->id,
                'txn_id' => $txnId,
            ]);

            return response()->json(['message' => 'OK']);
        }

        if ($status === PakasirGatewayService::STATUS_EXPIRED && $invoice->isPending()) {
            $invoice->update(['status' => BillingInvoice::STATUS_EXPIRED]);
            $invoice->clearPaymentPayload();
        }

        return response()->json(['message' => 'OK']);
    }

    /**
     * Bandingkan header X-Secret dengan secret proyek.
     *
     * hash_equals, bukan ===: perbandingan ini menyangkut rahasia yang bisa
     * dikirim ulang berkali-kali oleh penyerang, jadi kebocoran waktu tidak
     * perlu dipertaruhkan. Gagal-tertutup bila secret belum diset di panel —
     * secret kosong menolak semua, bukan menerima semua.
     */
    private function secretIsValid(Request $request): bool
    {
        $expected = (string) config('billing.pakasir.webhook_secret');
        $given = (string) $request->header('X-Secret', '');

        if ($expected === '' || $given === '') {
            return false;
        }

        return hash_equals($expected, $given);
    }
}
