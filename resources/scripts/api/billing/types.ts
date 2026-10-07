export interface BillingPlan {
    id: number;
    name: string;
    description: string | null;
    egg_id: number;
    node_id: number | null;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    threads: string | null;
    database_limit: number;
    allocation_limit: number;
    backup_limit: number;
    docker_image: string;
    startup: string;
    price_cents: number;
    duration_days: number;
    is_active: boolean;
    egg?: { id: number; name: string };
}

export interface BillingSubscription {
    id: number;
    user_id: number;
    plan_id: number;
    /** Nama server yang diminta user saat checkout; null untuk subscription lama. */
    server_name: string | null;
    server_id: number | null;
    status: 'pending_payment' | 'active' | 'suspended' | 'cancelled' | 'expired';
    expires_at: string | null;
    suspended_at: string | null;
    plan?: BillingPlan;
    server?: { id: number; name: string; status: string | null };
    /** Invoice pending terbaru saja (bukan seluruh riwayat). */
    pending_invoice?: BillingInvoice | null;
    invoices?: BillingInvoice[];
}

export interface BillingInvoice {
    id: number;
    subscription_id: number;
    user_id: number;
    order_id: string;
    inv_id: string | null;
    amount_cents: number;
    /** Nominal yang harus dibayar pembeli (amount + biaya layanan gateway). */
    total_payment_cents: number | null;
    redirect_url: string | null;
    qr_string: string | null;
    gateway_expires_at: string | null;
    status: 'pending' | 'paid' | 'expired' | 'failed' | 'cancelled';
    paid_at: string | null;
    type: 'initial' | 'renewal';
    subscription?: BillingSubscription;
}

export interface CheckoutResponse {
    subscription: BillingSubscription;
    invoice: BillingInvoice;
    redirect_url: string | null;
    qr_string: string | null;
}

export interface InvoiceDetailResponse {
    invoice: BillingInvoice;
    subscription: BillingSubscription | null;
    redirect_url: string | null;
    qr_string: string | null;
    /** ISO-8601 deadline pembayaran; null bila invoice tidak bisa dibayar lagi. */
    expires_at: string | null;
    can_pay: boolean;
    /**
     * Sisa waktu berlaku invoice dalam menit, dihitung server dari deadline
     * sebenarnya (gateway_expires_at Pakasir) — bukan konstanta config.
     */
    lifetime_minutes: number;
}
