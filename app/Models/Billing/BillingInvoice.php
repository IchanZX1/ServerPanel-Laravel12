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

    /**
     * Batas waktu invoice masih boleh dibayar.
     *
     * Prioritas: gateway_expires_at (dari API), fallback created_at +
     * invoice_lifetime_minutes. Dipakai halaman invoice untuk countdown dan
     * scheduler untuk membersihkan payload.
     */
    public function paymentDeadline(): \Illuminate\Support\Carbon
    {
        if (!is_null($this->gateway_expires_at)) {
            return $this->gateway_expires_at;
        }

        return $this->created_at->copy()->addMinutes((int) config('billing.invoice_lifetime_minutes', 3));
    }

    public function isExpiredByTime(): bool
    {
        return $this->isPending() && $this->paymentDeadline()->isPast();
    }

    /**
     * Bersihkan payload pembayaran (QR + redirect_url) setelah invoice
     * tidak lagi bisa dibayar. Ledger tetap utuh untuk audit.
     */
    public function clearPaymentPayload(): void
    {
        $this->forceFill([
            'qr_string' => null,
            'redirect_url' => null,
            'updated_at' => now(),
        ])->save();
    }
}
