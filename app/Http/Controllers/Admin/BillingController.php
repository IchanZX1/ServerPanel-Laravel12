<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;
use Pterodactyl\Http\Controllers\Controller;
use Prologue\Alerts\AlertsMessageBag;
use Illuminate\View\Factory as ViewFactory;
use Pterodactyl\Models\Billing\BillingPlan;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Node;

/**
 * CRUD paket billing untuk admin (blade, konsisten dengan admin/locations).
 * Plan terikat Egg (wajib) + optional Node. Environment disimpan json.
 */
class BillingController extends Controller
{
    public function __construct(
        protected AlertsMessageBag $alert,
        protected ViewFactory $view,
    ) {
    }

    public function plansIndex(): View
    {
        $plans = BillingPlan::query()->with(['egg:id,name', 'node:id,name'])->orderBy('price_cents')->get();
        $eggs = Egg::query()->orderBy('name')->get(['id', 'name']);
        $nodes = Node::query()->orderBy('name')->get(['id', 'name']);

        return view('admin.billing.plans', compact('plans', 'eggs', 'nodes'));
    }

    public function plansCreate(\Illuminate\Http\Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'description' => 'nullable|string',
            'egg_id' => 'required|exists:eggs,id',
            'node_id' => 'nullable|exists:nodes,id',
            'memory' => 'required|integer|min:0',
            'swap' => 'nullable|integer|min:-1',
            'disk' => 'required|integer|min:0',
            'io' => 'nullable|integer|min:10|max:1000',
            'cpu' => 'required|integer|min:0',
            'threads' => 'nullable|string|max:191',
            'database_limit' => 'nullable|integer|min:0',
            'allocation_limit' => 'nullable|integer|min:0',
            'backup_limit' => 'nullable|integer|min:0',
            'docker_image' => 'required|string|max:191',
            'startup' => 'required|string',
            'price_cents' => 'required|integer|min:0',
            'duration_days' => 'required|integer|min:1',
        ]);

        $plan = BillingPlan::query()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'egg_id' => $validated['egg_id'],
            'node_id' => $validated['node_id'] ?? null,
            'memory' => $validated['memory'],
            'swap' => $validated['swap'] ?? 0,
            'disk' => $validated['disk'],
            'io' => $validated['io'] ?? 500,
            'cpu' => $validated['cpu'],
            'threads' => $validated['threads'] ?? null,
            'database_limit' => $validated['database_limit'] ?? 0,
            'allocation_limit' => $validated['allocation_limit'] ?? 0,
            'backup_limit' => $validated['backup_limit'] ?? 0,
            'docker_image' => $validated['docker_image'],
            'startup' => $validated['startup'],
            'environment' => null,
            'price_cents' => $validated['price_cents'],
            'duration_days' => $validated['duration_days'],
            'is_active' => true,
        ]);

        $this->alert->success("Paket \"{$plan->name}\" berhasil dibuat.")->flash();

        return redirect()->route('admin.billing.plans');
    }

    public function plansUpdate(\Illuminate\Http\Request $request, BillingPlan $plan): RedirectResponse
    {
        if ($request->input('action') === 'delete') {
            $plan->delete();
            $this->alert->success('Paket dihapus.')->flash();

            return redirect()->route('admin.billing.plans');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'description' => 'nullable|string',
            'egg_id' => 'required|exists:eggs,id',
            'node_id' => 'nullable|exists:nodes,id',
            'memory' => 'required|integer|min:0',
            'swap' => 'nullable|integer|min:-1',
            'disk' => 'required|integer|min:0',
            'io' => 'nullable|integer|min:10|max:1000',
            'cpu' => 'required|integer|min:0',
            'threads' => 'nullable|string|max:191',
            'database_limit' => 'nullable|integer|min:0',
            'allocation_limit' => 'nullable|integer|min:0',
            'backup_limit' => 'nullable|integer|min:0',
            'docker_image' => 'required|string|max:191',
            'startup' => 'required|string',
            'price_cents' => 'required|integer|min:0',
            'duration_days' => 'required|integer|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        $plan->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'egg_id' => $validated['egg_id'],
            'node_id' => $validated['node_id'] ?? null,
            'memory' => $validated['memory'],
            'swap' => $validated['swap'] ?? 0,
            'disk' => $validated['disk'],
            'io' => $validated['io'] ?? 500,
            'cpu' => $validated['cpu'],
            'threads' => $validated['threads'] ?? null,
            'database_limit' => $validated['database_limit'] ?? 0,
            'allocation_limit' => $validated['allocation_limit'] ?? 0,
            'backup_limit' => $validated['backup_limit'] ?? 0,
            'docker_image' => $validated['docker_image'],
            'startup' => $validated['startup'],
            'price_cents' => $validated['price_cents'],
            'duration_days' => $validated['duration_days'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        $this->alert->success('Paket diperbarui.')->flash();

        return redirect()->route('admin.billing.plans');
    }

    public function subscriptionsIndex(): View
    {
        $subscriptions = \Pterodactyl\Models\Billing\BillingSubscription::query()
            ->with(['user:id,username,email', 'plan:id,name', 'server:id,name,status'])
            ->latest()
            ->paginate(50);

        return view('admin.billing.subscriptions', compact('subscriptions'));
    }

    public function invoicesIndex(): View
    {
        $invoices = \Pterodactyl\Models\Billing\BillingInvoice::query()
            ->with(['user:id,username', 'subscription:id,plan_id,server_id'])
            ->latest()
            ->paginate(50);

        return view('admin.billing.invoices', compact('invoices'));
    }

    public function retryProvision(\Pterodactyl\Models\Billing\BillingSubscription $subscription): RedirectResponse
    {
        if (is_null($subscription->server_id) && $subscription->status === \Pterodactyl\Models\Billing\BillingSubscription::STATUS_ACTIVE) {
            $paidInvoice = $subscription->invoices()->where('status', \Pterodactyl\Models\Billing\BillingInvoice::STATUS_PAID)->latest()->first();
            if (is_null($paidInvoice)) {
                $this->alert->danger('Tidak ada invoice PAID untuk subscription ini.')->flash();

                return redirect()->route('admin.billing.subscriptions');
            }

            $serverName = $subscription->user->username . '-' . strtolower(preg_replace('/[^a-z0-9]+/i', '-', $subscription->plan->name)) . '-' . $subscription->id;
            app()->make(\Pterodactyl\Services\Billing\SubscriptionProvisionService::class)
                ->handle($subscription, $serverName);

            $this->alert->success('Server berhasil di-provision ulang.')->flash();
        } else {
            $this->alert->danger('Provision ulang tidak diperlukan / subscription belum aktif.')->flash();
        }

        return redirect()->route('admin.billing.subscriptions');
    }
}
