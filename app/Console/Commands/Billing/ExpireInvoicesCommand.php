<?php

namespace Pterodactyl\Console\Commands\Billing;

use Illuminate\Console\Command;
use Pterodactyl\Models\Billing\BillingInvoice;

/**
 * Expire invoice pending yang lewat deadline dan bersihkan payload
 * pembayarannya (qr_string + redirect_url).
 *
 * Deadline utamanya datang dari gateway (`gateway_expires_at`, umur QR yang
 * sebenarnya). `invoice_lifetime_minutes` hanya fallback untuk invoice yang
 * tidak mendapat `expired_at` dari Pakasir.
 */
class ExpireInvoicesCommand extends Command
{
    protected $signature = 'billing:expire-invoices';

    protected $description = 'Expire invoice pending yang lewat deadline dan bersihkan payload pembayarannya.';

    public function handle(): int
    {
        $lifetimeMinutes = (int) config('billing.invoice_lifetime_minutes', 3);

        // Kandidat: pending dan (gateway_expires_at lewat | created_at + lifetime lewat).
        $candidates = BillingInvoice::query()
            ->where('status', BillingInvoice::STATUS_PENDING)
            ->where(function ($query) use ($lifetimeMinutes) {
                $query->whereNotNull('gateway_expires_at')
                    ->where('gateway_expires_at', '<=', now())
                    ->orWhere(function ($inner) use ($lifetimeMinutes) {
                        $inner->whereNull('gateway_expires_at')
                            ->where('created_at', '<=', now()->copy()->subMinutes($lifetimeMinutes));
                    });
            })
            ->get();

        $expired = 0;
        foreach ($candidates as $invoice) {
            $invoice->update(['status' => BillingInvoice::STATUS_EXPIRED]);
            $invoice->clearPaymentPayload();
            $expired++;
        }

        $this->info("Invoices expired: {$expired}.");

        return self::SUCCESS;
    }
}
