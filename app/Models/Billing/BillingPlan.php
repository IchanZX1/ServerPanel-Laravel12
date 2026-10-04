<?php

namespace Pterodactyl\Models\Billing;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Node;

class BillingPlan extends Model
{
    protected $table = 'billing_plans';

    protected $fillable = [
        'name',
        'description',
        'egg_id',
        'node_id',
        'memory',
        'swap',
        'disk',
        'io',
        'cpu',
        'threads',
        'database_limit',
        'allocation_limit',
        'backup_limit',
        'docker_image',
        'startup',
        'environment',
        'price_cents',
        'duration_days',
        'is_active',
    ];

    protected $casts = [
        'environment' => 'array',
        'is_active' => 'boolean',
        'memory' => 'integer',
        'swap' => 'integer',
        'disk' => 'integer',
        'io' => 'integer',
        'cpu' => 'integer',
        'database_limit' => 'integer',
        'allocation_limit' => 'integer',
        'backup_limit' => 'integer',
        'price_cents' => 'integer',
        'duration_days' => 'integer',
    ];

    public function egg(): BelongsTo
    {
        return $this->belongsTo(Egg::class);
    }

    public function node(): BelongsTo
    {
        return $this->belongsTo(Node::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(BillingSubscription::class, 'plan_id');
    }
}
