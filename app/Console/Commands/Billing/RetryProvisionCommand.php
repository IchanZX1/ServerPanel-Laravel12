<?php

namespace Pterodactyl\Console\Commands\Billing;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Models\Billing\BillingInvoice;
use Pterodactyl\Models\Billing\BillingSubscription;
use Pterodactyl\Services\Billing\SubscriptionProvisionService;

/**
 * Provision ulang subscription yang sudah dibayar tapi belum punya server.
 *
 * Kasus utama: provisioning gagal saat pembayaran diproses (daemon menolak,
 * alokasi habis, egg variable kurang). Tanpa command ini subscription itu
 * menggantung selamanya sampai admin klik retry manual di panel admin.
 */
class RetryProvisionCommand extends Command
{
    protected $signature = 'billing:retry-provision {--limit=5 : Jumlah maksimum subscription per jalan}';

    protected $description = 'Provision ulang subscription PAID yang belum punya server.';

    public function handle(): int
    {
        $subscriptions = BillingSubscription::query()
            ->whereNull('server_id')
            ->whereIn('status', [
                BillingSubscription::STATUS_PENDING_PAYMENT,
                BillingSubscription::STATUS_ACTIVE,
            ])
            ->orderBy('id')
            ->limit((int) $this->option('limit'))
            ->get();

        $succeeded = 0;

        foreach ($subscriptions as $subscription) {
            $paidInvoice = $subscription->invoices()
                ->where('status', BillingInvoice::STATUS_PAID)
                ->latest()
                ->first();

            // Belum dibayar -> bukan urusan command ini.
            if (is_null($paidInvoice)) {
                continue;
            }

            $plan = $subscription->plan;
            if (is_null($plan)) {
                continue;
            }

            $serverName = $subscription->server_name
                ?: $subscription->user->username . '-' . strtolower(preg_replace('/[^a-z0-9]+/i', '-', $plan->name)) . '-' . $subscription->id;

            try {
                app()->make(SubscriptionProvisionService::class)->handle($subscription, $serverName);

                // Provisioning sukses -> subscription memang aktif.
                $subscription->update(['status' => BillingSubscription::STATUS_ACTIVE]);

                $succeeded++;
                $this->info("Subscription #{$subscription->id} ter-provision.");
            } catch (\Throwable $e) {
                // Biarkan tetap pending supaya dicoba lagi jalan berikutnya.
                Log::warning('Billing: retry provision otomatis gagal', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);

                $this->warn("Subscription #{$subscription->id} gagal: {$e->getMessage()}");
            }
        }

        $this->info("Selesai: {$succeeded} berhasil dari {$subscriptions->count()} kandidat.");

        return self::SUCCESS;
    }
}
