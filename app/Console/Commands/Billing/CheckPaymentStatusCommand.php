<?php

namespace Pterodactyl\Console\Commands\Billing;

use Illuminate\Console\Command;
use Pterodactyl\Jobs\Billing\MarkInvoicePaidJob;
use Pterodactyl\Models\Billing\BillingInvoice;
use Pterodactyl\Services\Billing\SociabuzzGatewayService;

/**
 * Verifikasi manual satu invoice (trigger oleh tombol "Saya sudah bayar").
 */
class CheckPaymentStatusCommand extends Command
{
    protected $signature = 'billing:check {invoiceId}';

    protected $description = 'Cek status satu invoice via gateway dan terapkan bila PAID.';

    public function handle(): int
    {
        $invoice = BillingInvoice::query()->findOrFail($this->argument('invoiceId'));

        if (!$invoice->isPending()) {
            $this->info("Invoice #{$invoice->id} status: {$invoice->status} (skip).");

            return self::SUCCESS;
        }

        $gateway = app()->make(SociabuzzGatewayService::class);
        $status = $gateway->checkPaymentStatus($invoice->redirect_url);

        $this->info("Invoice #{$invoice->id} status gateway: {$status}");

        if ($status === SociabuzzGatewayService::STATUS_PAID) {
            $invoice->update(['status' => BillingInvoice::STATUS_PAID, 'paid_at' => now()]);
            MarkInvoicePaidJob::dispatch($invoice)->onQueue('billing');
            $this->info('Invoice PAID, MarkInvoicePaidJob dispatched.');
        }

        return self::SUCCESS;
    }
}
