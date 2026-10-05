<?php

namespace Pterodactyl\Jobs\Billing;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Models\Billing\BillingInvoice;
use Pterodactyl\Services\Billing\SociabuzzGatewayService;

/**
 * Verifikasi status invoice pending via scrape redirect_url.
 *
 * Job ini TIDAK mem-poll dirinya sendiri. Polling berkala dijalankan oleh
 * scheduler (`billing:verify-pending`, setiap menit). Alasannya:
 * `QUEUE_CONNECTION=sync` mengabaikan `delay()` (SyncQueue::later() hanya
 * memanggil push()), sehingga self re-dispatch akan dieksekusi inline dan
 * berujung rekursi tak terbatas selama status masih PENDING.
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

        // redirect_url dibersihkan setelah invoice tidak bisa dibayar lagi,
        // jadi ini juga jadi penanda invoice sudah mati.
        if (empty($this->invoice->redirect_url)) {
            $this->invoice->update(['status' => BillingInvoice::STATUS_EXPIRED]);
            Log::info('Billing: invoice expired (payload kosong)', ['invoice_id' => $this->invoice->id]);

            return;
        }

        $gateway = app()->make(SociabuzzGatewayService::class);

        try {
            $status = $gateway->checkPaymentStatus($this->invoice->redirect_url);
        } catch (\Throwable $e) {
            // Gateway tidak bisa dihubungi (mis. cURL error 60 di dev): biarkan
            // invoice tetap pending supaya poll berikutnya mencoba lagi.
            Log::warning('Billing: gagal cek status gateway', [
                'invoice_id' => $this->invoice->id,
                'error' => $e->getMessage(),
            ]);

            return;
        }

        if ($status === SociabuzzGatewayService::STATUS_PAID) {
            $this->invoice->update(['status' => BillingInvoice::STATUS_PAID, 'paid_at' => now()]);
            MarkInvoicePaidJob::dispatch($this->invoice)->onQueue('billing');

            return;
        }

        // Gateway bilang expired, ATAU status tak terbaca dan deadline sudah
        // lewat + grace. Grace mencegah race saat pembayaran tepat di menit akhir.
        $graceSeconds = (int) config('billing.expiry_grace_seconds', 120);
        $pastDeadline = $this->invoice->paymentDeadline()->addSeconds($graceSeconds)->isPast();

        if ($status === SociabuzzGatewayService::STATUS_EXPIRED || $pastDeadline) {
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
