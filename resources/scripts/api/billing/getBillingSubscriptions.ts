import http, { PaginatedResult, PaginationDataSet } from '@/api/http';
import { BillingSubscription } from '@/api/billing/types';

/**
 * Laravel LengthAwarePaginator mengembalikan bentuk datar
 * (`data`, `total`, `per_page`, `current_page`, `last_page`), bukan bentuk
 * Fractal, jadi `getPaginationSet` dari api/http tidak bisa dipakai langsung.
 */
export function toPaginationSet(data: any): PaginationDataSet {
    return {
        total: data.total ?? 0,
        count: (data.data || []).length,
        perPage: data.per_page ?? 0,
        currentPage: data.current_page ?? 1,
        totalPages: data.last_page ?? 1,
    };
}

export default (page = 1): Promise<PaginatedResult<BillingSubscription>> => {
    return new Promise((resolve, reject) => {
        http.get('/billing/api/subscriptions', { params: { page } })
            .then(({ data }) =>
                resolve({
                    items: (data.data || []) as BillingSubscription[],
                    pagination: toPaginationSet(data),
                })
            )
            .catch(reject);
    });
};
