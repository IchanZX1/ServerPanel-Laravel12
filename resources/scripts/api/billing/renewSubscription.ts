import http from '@/api/http';
import { BillingInvoice } from '@/api/billing/types';

export default (subscriptionId: number): Promise<{ invoice: BillingInvoice; redirect_url: string; qr_string: string | null }> => {
    return new Promise((resolve, reject) => {
        http.post(`/billing/api/subscriptions/${subscriptionId}/renew`)
            .then(({ data }) => resolve(data))
            .catch(reject);
    });
};
