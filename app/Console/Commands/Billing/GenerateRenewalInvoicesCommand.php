<?php

namespace Pterodactyl\Console\Commands\Billing;

use Illuminate\Console\Command;
use Pterodactyl\Models\Billing\BillingInvoice;
use Pterodactyl\Models\Billing\BillingSubscription;
use Pterodactyl\Services\Billing\SociabuzzGatewayService;

class GenerateRenewalInvoicesCommand extends Command
{
    protected $signature = 'billing:generate-renewals';

    protected $description = 'Buat invoice renewal H-x untuk subscription aktif yang akan expired.';

    public function handle(): int
    {
        $daysBefore = (int) config('billing.renewal_days_before');
        $threshold = now()->copy()->addDays($daysBefore);

        $subscriptions = BillingSubscription::query()
            ->where('status', BillingSubscription::STATUS_ACTIVE)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $threshold)
            ->whereDoesntHave('invoices', function ($q) {
                $q->where('status', BillingInvoice::STATUS_PENDING)
                    ->where('type', BillingInvoice::TYPE_RENEWAL);
            })
            ->with(['user', 'plan'])
            ->get();

        $gateway = app()->make(SociabuzzGatewayService::class);
        $created = 0;

        foreach ($subscriptions as $subscription) {
            $user = $subscription->user;
            $plan = $subscription->plan;
            if (is_null($user) || is_null($plan)) {
                continue;
            }

            $payment = $gateway->createPayment(
                amount: $plan->price_cents,
                fullname: trim(($user->name_first ?? '') . ' ' . ($user->name_last ?? '')) ?: $user->username,
                email: $user->email,
                note: "Renewal #{$subscription->id} - {$plan->name}",
            );

            BillingInvoice::query()->create([
                'subscription_id' => $subscription->id,
                'user_id' => $subscription->user_id,
                'order_id' => $payment['order_id'],
                'inv_id' => $payment['inv_id'] ?? null,
                'amount_cents' => $plan->price_cents,
                'redirect_url' => $payment['redirect_url'],
                'qr_string' => $payment['qr_string'] ?? null,
                'gateway_expires_at' => isset($payment['expiration_date']) ? \Illuminate\Support\Carbon::parse($payment['expiration_date']) : null,
                'status' => BillingInvoice::STATUS_PENDING,
                'type' => BillingInvoice::TYPE_RENEWAL,
            ]);

            $created++;
            $this->info("Renewal invoice for subscription #{$subscription->id} (order {$payment['order_id']}).");
        }

        $this->info("Renewals: {$created} created (out of {$subscriptions->count()} eligible).");

        return self::SUCCESS;
    }
}
