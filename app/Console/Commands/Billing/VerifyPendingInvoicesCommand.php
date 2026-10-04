<?php

namespace Pterodactyl\Console\Commands\Billing;

use Illuminate\Console\Command;
use Pterodactyl\Jobs\Billing\VerifyInvoicePaymentJob;
use Pterodactyl\Models\Billing\BillingInvoice;

class VerifyPendingInvoicesCommand extends Command
{
    protected $signature = 'billing:verify-pending';

    protected $description = 'Dispatch verify job untuk semua invoice pending.';

    public function handle(): int
    {
        $invoices = BillingInvoice::query()
            ->where('status', BillingInvoice::STATUS_PENDING)
            ->get();

        foreach ($invoices as $invoice) {
            VerifyInvoicePaymentJob::dispatch($invoice)->onQueue('billing');
        }

        $this->info("Dispatched {$invoices->count()} invoice(s).");

        return self::SUCCESS;
    }
}
