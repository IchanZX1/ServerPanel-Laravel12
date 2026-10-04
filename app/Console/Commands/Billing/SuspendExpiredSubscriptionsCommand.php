<?php

namespace Pterodactyl\Console\Commands\Billing;

use Illuminate\Console\Command;
use Pterodactyl\Models\Billing\BillingSubscription;
use Pterodactyl\Services\Servers\SuspensionService;

/**
 * Suspend server milik subscription yang expires_at sudah lewat (+ grace).
 */
class SuspendExpiredSubscriptionsCommand extends Command
{
    protected $signature = 'billing:suspend-expired';

    protected $description = 'Suspend server milik subscription yang sudah expired.';

    public function handle(): int
    {
        $grace = (int) config('billing.grace_period_days');
        $cutoff = now()->subDays($grace);

        $subscriptions = BillingSubscription::query()
            ->where('status', BillingSubscription::STATUS_ACTIVE)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', $cutoff)
            ->with('server')
            ->get();

        $suspension = app()->make(SuspensionService::class);
        $suspended = 0;

        foreach ($subscriptions as $subscription) {
            $subscription->update([
                'status' => BillingSubscription::STATUS_SUSPENDED,
                'suspended_at' => now(),
            ]);

            $server = $subscription->server;
            if (!is_null($server) && !$server->isSuspended()) {
                try {
                    $suspension->toggle($server, SuspensionService::ACTION_SUSPEND);
                    $suspended++;
                } catch (\Throwable $e) {
                    $this->warn("Suspend gagal untuk server #{$server->id}: {$e->getMessage()} (retry hourly)");
                }
            }

            $this->info("Marked subscription #{$subscription->id} suspended (user {$subscription->user_id}).");
        }

        $this->info("Suspend-expired: {$subscriptions->count()} subscription(s), {$suspended} server(s) suspended.");

        return self::SUCCESS;
    }
}
