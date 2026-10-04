import http from '@/api/http';
import { InvoiceDetailResponse } from '@/api/billing/types';

export default (invoiceId: number): Promise<InvoiceDetailResponse> => {
    return new Promise((resolve, reject) => {
        http.get(`/billing/api/invoices/${invoiceId}`)
            .then(({ data }) => resolve(data))
            .catch(reject);
    });
};
