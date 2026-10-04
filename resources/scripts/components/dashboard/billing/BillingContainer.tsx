import React, { useEffect, useState } from 'react';
import PageContentBlock from '@/components/elements/PageContentBlock';
import ContentBox from '@/components/elements/ContentBox';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import FlashMessageRender from '@/components/FlashMessageRender';
import { useFlashKey } from '@/plugins/useFlash';
import useFlash from '@/plugins/useFlash';
import { Button } from '@/components/elements/button/index';
import tw from 'twin.macro';
import getBillingSubscriptions from '@/api/billing/getBillingSubscriptions';
import getBillingInvoices from '@/api/billing/getBillingInvoices';
import checkInvoice from '@/api/billing/checkInvoice';
import renewSubscription from '@/api/billing/renewSubscription';
import { BillingInvoice, BillingSubscription } from '@/api/billing/types';

const statusColor: Record<string, ReturnType<typeof tw>> = {
    active: tw`text-green-400`,
    suspended: tw`text-yellow-400`,
    pending_payment: tw`text-blue-400`,
    pending: tw`text-yellow-400`,
    paid: tw`text-green-400`,
    expired: tw`text-red-400`,
    cancelled: tw`text-neutral-500`,
    failed: tw`text-red-400`,
};

const priceFmt = (c: number) => `Rp ${c.toLocaleString('id-ID')}`;

export default () => {
    const flashKey = 'billing-history';
    const { clearAndAddHttpError, clearFlashes } = useFlashKey(flashKey);
    const { addFlash } = useFlash();
    const [subscriptions, setSubscriptions] = useState<BillingSubscription[]>([]);
    const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = () => {
        setLoading(true);
        Promise.all([getBillingSubscriptions(), getBillingInvoices()])
            .then(([subs, invs]) => {
                setSubscriptions(subs);
                setInvoices(invs);
            })
            .catch(clearAndAddHttpError)
            .then(() => setLoading(false));
    };

    useEffect(refresh, []);

    const onCheck = async (invoice: BillingInvoice) => {
        setLoading(true);
        clearFlashes();
        try {
            const res = await checkInvoice(invoice.id);
            if (res.invoice?.status === 'paid') {
                addFlash({ key: flashKey, type: 'success', message: 'Pembayaran diterima!' });
            } else if (res.invoice?.status === 'expired') {
                addFlash({ key: flashKey, type: 'error', message: 'Invoice expired — silakan checkout/renew lagi.' });
            } else {
                addFlash({ key: flashKey, type: 'info', message: 'Status masih pending. Cek lagi beberapa saat.' });
            }
        } catch (e: any) {
            clearAndAddHttpError(e);
        }
        refresh();
    };

    const onRenew = async (subscription: BillingSubscription) => {
        setLoading(true);
        clearFlashes();
        try {
            const res = await renewSubscription(subscription.id);
            addFlash({
                key: flashKey,
                type: 'success',
                message: `Invoice renewal dibuat: ${res.invoice.order_id}. Bayar via link dibawah ini.`,
            });
            // Tampilkan tautan pembayaran renewal langsung
            window.open(res.redirect_url, '_blank');
        } catch (e: any) {
            clearAndAddHttpError(e);
        }
        refresh();
    };

    const canRenew = (s: BillingSubscription) =>
        (s.status === 'active' || s.status === 'suspended') &&
        !(s.invoices || []).some((i) => i.status === 'pending' && i.type === 'renewal');

    return (
        <PageContentBlock title={'Billing'}>
            <FlashMessageRender byKey={flashKey} css={tw`mb-4`} />
            <div css={tw`relative`}>
                <SpinnerOverlay visible={loading} />

                <ContentBox title={'Subscriptions'} css={tw`mb-6`}>
                    {subscriptions.length === 0 && <p css={tw`text-neutral-400 text-sm`}>Belum ada subscription. Beli di <a href="/store" css={tw`text-cyan-400`}>Store</a>.</p>}
                    {subscriptions.map((s) => (
                        <div key={s.id} css={tw`border-b border-neutral-600 py-3 last:border-0`}>
                            <div css={tw`flex justify-between items-center flex-wrap gap-2`}>
                                <div>
                                    <p css={tw`font-medium`}>
                                        #{s.id} — {s.plan?.name ?? `Plan #${s.plan_id}`}
                                        {s.server ? (
                                            <a href={`/server/${s.server.id}`} css={tw`ml-2 text-cyan-400 text-sm no-underline`}>{s.server.name}</a>
                                        ) : (
                                            <span css={tw`ml-2 text-neutral-500 text-sm`}>(tanpa server)</span>
                                        )}
                                    </p>
                                    <p css={tw`text-xs text-neutral-500`}>Expires: {s.expires_at ? new Date(s.expires_at).toLocaleString('id-ID') : '—'}</p>
                                </div>
                                <div css={tw`text-right`}>
                                    <span css={[tw`text-sm font-medium`, statusColor[s.status] ?? tw``]}>{s.status}</span>
                                    {canRenew(s) && (
                                        <div css={tw`mt-1`}>
                                            <Button onClick={() => onRenew(s)}>Perpanjang</Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </ContentBox>

                <ContentBox title={'Invoices'}>
                    {invoices.length === 0 && <p css={tw`text-neutral-400 text-sm`}>Belum ada invoice.</p>}
                    {invoices.map((i) => (
                        <div key={i.id} css={tw`border-b border-neutral-600 py-3 last:border-0`}>
                            <div css={tw`flex justify-between items-center flex-wrap gap-2`}>
                                <div>
                                    <p css={tw`font-medium text-sm`}><code>{i.order_id}</code> <span css={tw`text-xs text-neutral-500`}>{i.type}</span></p>
                                    <p css={tw`text-sm`}>{priceFmt(i.amount_cents)}</p>
                                </div>
                                <div css={tw`text-right`}>
                                    <span css={[tw`text-sm font-medium`, statusColor[i.status] ?? tw``]}>{i.status}</span>
                                    {i.status === 'pending' && (
                                        <div css={tw`mt-1 space-x-2`}>
                                            <a href={`/store/invoice/${i.id}`} css={tw`text-cyan-400 text-sm no-underline`}>Bayar</a>
                                            <Button onClick={() => onCheck(i)}>Cek status</Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </ContentBox>
            </div>
        </PageContentBlock>
    );
};
