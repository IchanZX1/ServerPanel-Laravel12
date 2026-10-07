<?php

namespace Pterodactyl\Console\Commands\Billing;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Pterodactyl\Models\Billing\BillingInvoice;
use Pterodactyl\Models\Billing\BillingSubscription;
use Pterodactyl\Services\Billing\PakasirGatewayService;

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

        $gateway = app()->make(PakasirGatewayService::class);
        $created = 0;

        foreach ($subscriptions as $subscription) {
            $user = $subscription->user;
            $plan = $subscription->plan;
            if (is_null($user) || is_null($plan)) {
                continue;
            }

            // order_id harus ada sebelum panggilan gateway (Pakasir menaruhnya
            // di path URL) dan kolomnya unique NOT NULL di billing_invoices.
            $orderId = 'SP-' . Str::uuid()->toString();

            // Satu kegagalan gateway tidak boleh membatalkan seluruh batch:
            // subscription berikutnya masih berhak dapat invoice.
            try {
                $payment = $gateway->createQrisTransaction(
                    amount: $plan->price_cents,
                    orderId: $orderId,
                );
            } catch (\Throwable $e) {
                Log::warning('Billing: gagal membuat invoice renewal', [
                    'subscription_id' => $subscription->id,
                    'plan_id' => $plan->id,
                    'error' => $e->getMessage(),
                ]);
                $this->error("Subscription #{$subscription->id} gagal: {$e->getMessage()}");

                continue;
            }

            BillingInvoice::query()->create([
                'subscription_id' => $subscription->id,
                'user_id' => $subscription->user_id,
                'order_id' => $orderId,
                'inv_id' => $payment['txn_id'] ?? null,
                'amount_cents' => $plan->price_cents,
                'total_payment_cents' => $payment['total_payment'] ?? $plan->price_cents,
                // QRIS tidak punya halaman pembayaran; lihat catatan di
                // BillingController::checkout().
                'redirect_url' => null,
                'qr_string' => $payment['qr_string'] ?? null,
                'gateway_expires_at' => PakasirGatewayService::parseExpiry($payment['expired_at'] ?? null),
                'status' => BillingInvoice::STATUS_PENDING,
                'type' => BillingInvoice::TYPE_RENEWAL,
            ]);

            $created++;
            $this->info("Renewal invoice for subscription #{$subscription->id} (order {$orderId}).");
        }

        $this->info("Renewals: {$created} created (out of {$subscriptions->count()} eligible).");

        return self::SUCCESS;
    }
}
