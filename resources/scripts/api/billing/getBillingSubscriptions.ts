import http from '@/api/http';
import { BillingSubscription } from '@/api/billing/types';

export default (): Promise<BillingSubscription[]> => {
    return new Promise((resolve, reject) => {
        http.get('/billing/api/subscriptions')
            .then(({ data }) => resolve(data || []))
            .catch(reject);
    });
};
