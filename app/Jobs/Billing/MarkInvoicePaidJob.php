<?php

namespace Pterodactyl\Jobs\Billing;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Models\Billing\BillingInvoice;
use Pterodactyl\Models\Billing\BillingSubscription;
use Pterodactyl\Services\Billing\SubscriptionProvisionService;
use Pterodactyl\Services\Servers\SuspensionService;

/**
 * Terapkan invoice yang sudah PAID: majukan subscription, provision
 * server (initial), unsuspend bila suspended.
 *
 * Provision gagal -> throw (job failed, retry via queue). Invoice tetap
 * paid, subscription pending_payment agar admin bisa retry manual.
 */
class MarkInvoicePaidJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public function __construct(
        public BillingInvoice $invoice,
    ) {
    }

    public function handle(): void
    {
        $invoice = BillingInvoice::query()->findOrFail($this->invoice->id);

        if ($invoice->status !== BillingInvoice::STATUS_PAID) {
            return;
        }

        /** @var BillingSubscription $subscription */
        $subscription = $invoice->subscription()->firstOrFail();
        $plan = $subscription->plan()->firstOrFail();

        // Hitung expiry baru: renewal menumpuk dari expiry lama bila masih aktif.
        $base = $subscription->expires_at && $subscription->expires_at->isFuture()
            ? $subscription->expires_at
            : now();
        $newExpiry = $base->copy()->addDays($plan->duration_days);

        DB::transaction(function () use ($invoice, $subscription, $plan, $newExpiry) {
            $invoice->update(['status' => BillingInvoice::STATUS_PAID, 'paid_at' => $invoice->paid_at ?? now()]);

            $subscription->update([
                'status' => BillingSubscription::STATUS_ACTIVE,
                'expires_at' => $newExpiry,
                'suspended_at' => null,
            ]);
        });

        $subscription->refresh();

        // Unsuspend server bila subscription sempat suspended.
        if (!is_null($subscription->server_id)) {
            $server = $subscription->server()->first();
            if (!is_null($server) && $server->isSuspended()) {
                app()->make(SuspensionService::class)
                    ->toggle($server, SuspensionService::ACTION_UNSUSPEND);
                Log::info('Billing: server unsuspended after payment', [
                    'subscription_id' => $subscription->id,
                    'server_id' => $server->id,
                ]);
            }
        }

        // Provision server baru untuk invoice initial.
        if ($invoice->type === BillingInvoice::TYPE_INITIAL && is_null($subscription->server_id)) {
            $planName = preg_replace('/[^a-z0-9]+/i', '-', strtolower($plan->name));
            $serverName = $subscription->user->username . '-' . trim($planName, '-') . '-' . $subscription->id;

            app()->make(SubscriptionProvisionService::class)
                ->handle($subscription, $serverName);
        }

        Log::info('Billing: invoice paid applied', [
            'invoice_id' => $invoice->id,
            'subscription_id' => $subscription->id,
            'expires_at' => $newExpiry->toIso8601String(),
        ]);
    }
}
