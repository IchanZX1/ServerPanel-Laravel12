import http, { PaginatedResult } from '@/api/http';
import { BillingInvoice } from '@/api/billing/types';
import { toPaginationSet } from '@/api/billing/getBillingSubscriptions';

export default (page = 1): Promise<PaginatedResult<BillingInvoice>> => {
    return new Promise((resolve, reject) => {
        http.get('/billing/api/invoices', { params: { page } })
            .then(({ data }) =>
                resolve({
                    items: (data.data || []) as BillingInvoice[],
                    pagination: toPaginationSet(data),
                })
            )
            .catch(reject);
    });
};
