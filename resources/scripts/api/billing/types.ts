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
    server_id: number | null;
    status: 'pending_payment' | 'active' | 'suspended' | 'cancelled' | 'expired';
    expires_at: string | null;
    suspended_at: string | null;
    plan?: BillingPlan;
    server?: { id: number; name: string; status: string | null };
    invoices?: BillingInvoice[];
}

export interface BillingInvoice {
    id: number;
    subscription_id: number;
    user_id: number;
    order_id: string;
    inv_id: string | null;
    amount_cents: number;
    redirect_url: string;
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
    redirect_url: string;
    qr_string: string | null;
}
