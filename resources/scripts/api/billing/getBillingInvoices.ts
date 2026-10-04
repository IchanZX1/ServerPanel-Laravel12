import http from '@/api/http';
import { BillingInvoice } from '@/api/billing/types';

export default (): Promise<BillingInvoice[]> => {
    return new Promise((resolve, reject) => {
        http.get('/billing/api/invoices')
            .then(({ data }) => resolve(data || []))
            .catch(reject);
    });
};
