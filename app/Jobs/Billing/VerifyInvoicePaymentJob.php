<?php

namespace Pterodactyl\Jobs\Billing;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Models\Billing\BillingInvoice;
use Pterodactyl\Services\Billing\PakasirGatewayService;

/**
 * Verifikasi status invoice pending lewat API status Pakasir.
 *
 * Job ini TIDAK mem-poll dirinya sendiri. Polling berkala dijalankan oleh
 * scheduler (`billing:verify-pending`, setiap menit). Alasannya:
 * `QUEUE_CONNECTION=sync` mengabaikan `delay()` (SyncQueue::later() hanya
 * memanggil push()), sehingga self re-dispatch akan dieksekusi inline dan
 * berujung rekursi tak terbatas selama status masih PENDING.
 *
 * Sejak migrasi ke Pakasir, job ini bukan lagi jalur utama: webhook yang
 * menangani sebagian besar pembayaran. Job ini adalah jaring pengaman bila
 * webhook hilang, dan satu-satunya jalur untuk tombol "Saya Sudah Bayar"
 * (dipanggil langsung lewat dispatch_sync dari BillingController::checkInvoice,
 * sehingga tetap bekerja di luar jendela polling).
 *
 * Urutan cek penting: gateway DULU, expiry BELAKANGAN. Invoice yang sudah
 * dibayar tidak boleh di-expire hanya karena `gateway_expires_at` lewat.
 */
class VerifyInvoicePaymentJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public BillingInvoice $invoice,
    ) {
    }

    public function handle(): void
    {
        $this->invoice->refresh();

        if (!$this->invoice->isPending()) {
            return;
        }

        // `qr_string` dibersihkan oleh clearPaymentPayload() setelah invoice
        // tidak bisa dibayar lagi, jadi ini penanda "invoice sudah mati".
        //
        // SEBELUM migrasi ke QRIS, penandanya `redirect_url`. QRIS tidak punya
        // halaman pembayaran, jadi `redirect_url` selalu null dan penanda itu
        // akan meng-expire SETIAP invoice pada poll pertama — termasuk yang
        // QR-nya sedang dilihat user. Jangan dikembalikan ke redirect_url.
        if (empty($this->invoice->qr_string)) {
            $this->invoice->update(['status' => BillingInvoice::STATUS_EXPIRED]);
            Log::info('Billing: invoice expired (payload kosong)', ['invoice_id' => $this->invoice->id]);

            return;
        }

        // Tanpa txn_id tidak ada yang bisa ditanyakan ke gateway. JANGAN tandai
        // expired di sini: ExpireInvoicesCommand yang memegang batas waktu, dan
        // invoice tanpa txn_id masih bisa jadi milik transaksi yang gagal dibuat.
        if (empty($this->invoice->inv_id)) {
            Log::warning('Billing: invoice pending tanpa txn_id, poll dilewati', [
                'invoice_id' => $this->invoice->id,
            ]);

            return;
        }

        $gateway = app()->make(PakasirGatewayService::class);

        try {
            $status = $gateway->checkTransactionStatus($this->invoice->inv_id);
        } catch (\Throwable $e) {
            // Gateway tidak bisa dihubungi (mis. cURL error 60 di dev): biarkan
            // invoice tetap pending supaya poll berikutnya mencoba lagi.
            Log::warning('Billing: gagal cek status gateway', [
                'invoice_id' => $this->invoice->id,
                'error' => $e->getMessage(),
            ]);

            return;
        }

        if ($status === PakasirGatewayService::STATUS_PAID) {
            $this->invoice->update(['status' => BillingInvoice::STATUS_PAID, 'paid_at' => now()]);

            // dispatchSync, bukan dispatch()->onQueue(). Tanpa worker antrean,
            // dispatch biasa hanya menumpuk di tabel jobs dan server tidak
            // pernah terbuat sampai ada yang menjalankan worker / retry manual.
            MarkInvoicePaidJob::dispatchSync($this->invoice);

            return;
        }

        // Gateway bilang canceled, ATAU status tak terbaca dan deadline sudah
        // lewat + grace. Grace mencegah race saat pembayaran tepat di menit akhir.
        $graceSeconds = (int) config('billing.expiry_grace_seconds', 120);
        $pastDeadline = $this->invoice->paymentDeadline()->addSeconds($graceSeconds)->isPast();

        if ($status === PakasirGatewayService::STATUS_EXPIRED || $pastDeadline) {
            $this->invoice->update(['status' => BillingInvoice::STATUS_EXPIRED]);
            Log::info('Billing: invoice expired', [
                'invoice_id' => $this->invoice->id,
                'gateway_status' => $status,
            ]);

            return;
        }

        // Masih PENDING / UNKNOWN dan belum lewat deadline -> biarkan scheduler
        // memanggil ulang job ini pada menit berikutnya.
    }
}
