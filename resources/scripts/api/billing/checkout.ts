import http from '@/api/http';
import { CheckoutResponse } from '@/api/billing/types';

export default (planId: number, serverName: string): Promise<CheckoutResponse> => {
    return new Promise((resolve, reject) => {
        http.post('/billing/api/checkout', {
            plan_id: planId,
            server_name: serverName,
        })
            .then(({ data }) => resolve(data))
            .catch(reject);
    });
};
