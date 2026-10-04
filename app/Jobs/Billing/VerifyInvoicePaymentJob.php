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
 * Self re-dispatch dengan delay sampai PAID, EXPIRED, atau lewat
 * gateway_expires_at + buffer.
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

        // Lewat gateway_expires_at + buffer 1 menit -> expired.
        if (!is_null($this->invoice->gateway_expires_at) && $this->invoice->gateway_expires_at->lt(now()->copy()->addMinute())) {
            $this->invoice->update(['status' => BillingInvoice::STATUS_EXPIRED]);
            Log::info('Billing: invoice expired', ['invoice_id' => $this->invoice->id]);

            return;
        }

        $gateway = app()->make(SociabuzzGatewayService::class);
        $status = $gateway->checkPaymentStatus($this->invoice->redirect_url);

        if ($status === SociabuzzGatewayService::STATUS_PAID) {
            $this->invoice->update(['status' => BillingInvoice::STATUS_PAID, 'paid_at' => now()]);
            MarkInvoicePaidJob::dispatch($this->invoice)->onQueue('billing');

            return;
        }

        if ($status === SociabuzzGatewayService::STATUS_EXPIRED) {
            $this->invoice->update(['status' => BillingInvoice::STATUS_EXPIRED]);
            Log::info('Billing: invoice expired', ['invoice_id' => $this->invoice->id]);

            return;
        }

        // PENDING / UNKNOWN -> re-dispatch delay.
        self::dispatch($this->invoice)
            ->delay(now()->addSeconds(max((int) config('billing.poll_interval_seconds'), 10)))
            ->onQueue('billing');
    }
}
