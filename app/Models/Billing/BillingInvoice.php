<?php

namespace Pterodactyl\Models\Billing;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Pterodactyl\Models\User;

class BillingInvoice extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    public const TYPE_INITIAL = 'initial';
    public const TYPE_RENEWAL = 'renewal';

    protected $table = 'billing_invoices';

    protected $fillable = [
        'subscription_id',
        'user_id',
        'order_id',
        'inv_id',
        'amount_cents',
        'redirect_url',
        'qr_string',
        'gateway_expires_at',
        'status',
        'paid_at',
        'type',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'gateway_expires_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(BillingSubscription::class, 'subscription_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}
