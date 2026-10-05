<?php

namespace Pterodactyl\Services\Billing;

use Illuminate\Support\Facades\Log;
use Pterodactyl\Models\Billing\BillingPlan;
use Pterodactyl\Models\Billing\BillingSubscription;
use Pterodactyl\Models\Objects\DeploymentObject;
use Pterodactyl\Services\Servers\ServerCreationService;

/**
 * Provision server otomatis untuk subscription billing.
 * Panggil ServerCreationService langsung (DI, bukan HTTP) — pola sama
 * dengan Api\Application\Servers\ServerController@store.
 *
 * Gagal provisioning (tidak ada alokasi/node viable/daemon down) TIDAK
 * di-swap: throw ke caller. Invoice tetap paid, subscription tetap
 * pending_payment agar admin bisa retry. Jangan telan error di sini.
 */
class SubscriptionProvisionService
{
    public const EXTERNAL_ID_PREFIX = 'billing-sub-';

    public function __construct(
        private ServerCreationService $creationService,
    ) {
    }

    /**
     * Buat server dari plan + subscription dan kaitkan ke subscription.
     *
     * @throws \Throwable
     * @throws \Pterodactyl\Exceptions\DisplayException
     * @throws \Illuminate\Validation\ValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     * @throws \Pterodactyl\Exceptions\Service\Deployment\NoViableNodeException
     * @throws \Pterodactyl\Exceptions\Service\Deployment\NoViableAllocationException
     */
    public function handle(BillingSubscription $subscription, string $serverName): \Pterodactyl\Models\Server
    {
        $plan = BillingPlan::query()->findOrFail($subscription->plan_id);

        // Egg variable wajib (mis. CMD_RUN di egg NodeJS) harus terisi atau
        // VariableValidatorService akan menolak pembuatan server. Plan yang
        // environment-nya kosong berutang pada default value egg variable.
        $environment = $plan->environment ?? [];
        $defaults = \Pterodactyl\Models\EggVariable::query()
            ->where('egg_id', $plan->egg_id)
            ->pluck('default_value', 'env_variable');

        foreach ($defaults as $env => $defaultValue) {
            if (!array_key_exists($env, $environment)) {
                $environment[$env] = $defaultValue;
            }
        }

        $data = [
            'external_id' => self::EXTERNAL_ID_PREFIX . $subscription->id,
            'name' => $serverName,
            'description' => "Billing subscription #{$subscription->id} (plan: {$plan->name})",
            'owner_id' => $subscription->user_id,
            'egg_id' => $plan->egg_id,
            'image' => $plan->docker_image,
            'startup' => $plan->startup,
            'environment' => $environment,
            'memory' => $plan->memory,
            'swap' => $plan->swap,
            'disk' => $plan->disk,
            'io' => $plan->io,
            'cpu' => $plan->cpu,
            'threads' => $plan->threads,
            'database_limit' => $plan->database_limit,
            'allocation_limit' => $plan->allocation_limit,
            'backup_limit' => $plan->backup_limit,
            'skip_scripts' => false,
            'start_on_completion' => true,
        ];

        $deployment = null;
        if (empty($plan->node_id)) {
            // Auto-deploy ke node viable manapun — biarkan
            // FindViableNodesService/AllocationSelectionService di dalam
            // ServerCreationService yang memilih.
            $deployment = (new DeploymentObject())
                ->setDedicated(false)
                ->setLocations([]) // semua lokasi
                ->setPorts([]);
        } else {
            $allocation = \Pterodactyl\Models\Allocation::query()
                ->where('node_id', $plan->node_id)
                ->whereNull('server_id')
                ->orderBy('id')
                ->first();
            if (is_null($allocation)) {
                throw new \Pterodactyl\Exceptions\DisplayException(
                    "Tidak ada alokasi bebas di node {$plan->node_id} untuk plan {$plan->name}."
                );
            }
            $data['allocation_id'] = $allocation->id;
        }

        $server = $this->creationService->handle($data, $deployment);

        $subscription->update(['server_id' => $server->id]);

        Log::info('Billing: server provisioned', [
            'subscription_id' => $subscription->id,
            'server_id' => $server->id,
            'plan_id' => $plan->id,
        ]);

        return $server;
    }
}
