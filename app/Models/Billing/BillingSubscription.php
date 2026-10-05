<?php

namespace Pterodactyl\Models\Billing;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\User;

class BillingSubscription extends Model
{
    public const STATUS_PENDING_PAYMENT = 'pending_payment';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';

    protected $table = 'billing_subscriptions';

    protected $fillable = [
        'user_id',
        'plan_id',
        'server_name',
        'server_id',
        'status',
        'expires_at',
        'suspended_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'suspended_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(BillingPlan::class, 'plan_id');
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(BillingInvoice::class, 'subscription_id');
    }

    /**
     * Invoice pending terbaru (dipakai badge/header, bukan load semua).
     *
     * Sengaja TIDAK memakai `ofMany()`/`latestOfMany()`: keduanya membangun
     * subquery agregat `MAX(id) ... GROUP BY`, yang di MySQL dengan
     * `only_full_group_by` mudah ditolak saat eager load membawa daftar kolom.
     * `hasOne` + `orderByDesc` memakai `WHERE IN (...)` biasa, dan Laravel
     * menyimpan hasil pertama per subscription — hasilnya sama tanpa agregat.
     */
    public function pendingInvoice(): HasOne
    {
        return $this->hasOne(BillingInvoice::class, 'subscription_id')
            ->where('status', BillingInvoice::STATUS_PENDING)
            ->orderByDesc('id');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
