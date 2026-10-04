import http from '@/api/http';
import { BillingPlan } from '@/api/billing/types';

export default (): Promise<BillingPlan[]> => {
    return new Promise((resolve, reject) => {
        http.get('/billing/api/plans')
            .then(({ data }) => resolve(data || []))
            .catch(reject);
    });
};
