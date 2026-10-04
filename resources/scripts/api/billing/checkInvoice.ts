import http from '@/api/http';
import { BillingInvoice } from '@/api/billing/types';

export default (invoiceId: number): Promise<{ message: string; invoice: BillingInvoice }> => {
    return new Promise((resolve, reject) => {
        http.post(`/billing/api/invoices/${invoiceId}/check`)
            .then(({ data }) => resolve(data))
            .catch(reject);
    });
};
