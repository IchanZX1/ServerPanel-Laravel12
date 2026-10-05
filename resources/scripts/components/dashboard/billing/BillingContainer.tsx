import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageContentBlock from '@/components/elements/PageContentBlock';
import ContentBox from '@/components/elements/ContentBox';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import FlashMessageRender from '@/components/FlashMessageRender';
import { useFlashKey } from '@/plugins/useFlash';
import useFlash from '@/plugins/useFlash';
import { Button } from '@/components/elements/button/index';
import tw, { TwStyle } from 'twin.macro';
import getBillingSubscriptions from '@/api/billing/getBillingSubscriptions';
import getBillingInvoices from '@/api/billing/getBillingInvoices';
import checkInvoice from '@/api/billing/checkInvoice';
import renewSubscription from '@/api/billing/renewSubscription';
import { BillingInvoice, BillingSubscription } from '@/api/billing/types';

const statusColor: Record<string, TwStyle> = {
    active: tw`text-green-400`,
    suspended: tw`text-yellow-400`,
    pending_payment: tw`text-blue-400`,
    pending: tw`text-yellow-400`,
    paid: tw`text-green-400`,
    expired: tw`text-red-400`,
    cancelled: tw`text-neutral-500`,
    failed: tw`text-red-400`,
};

// Label bahasa Indonesia — status tidak boleh bergantung warna saja (WCAG 1.4.1).
const statusLabel: Record<string, string> = {
    active: 'Aktif',
    suspended: 'Ditangguhkan',
    pending_payment: 'Menunggu pembayaran',
    pending: 'Menunggu pembayaran',
    paid: 'Dibayar',
    expired: 'Kedaluwarsa',
    cancelled: 'Dibatalkan',
    failed: 'Gagal',
};

const priceFmt = (c: number) => `Rp ${c.toLocaleString('id-ID')}`;

const StatusBadge = ({ status }: { status: string }) => (
    <span
        css={[tw`text-sm font-medium`, statusColor[status] ?? tw`text-neutral-400`]}
        title={statusLabel[status] ?? status}
    >
        {statusLabel[status] ?? status}
    </span>
);

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
                addFlash({ key: flashKey, type: 'error', message: 'Invoice kedaluwarsa — silakan checkout/renew lagi.' });
            } else {
                addFlash({ key: flashKey, type: 'info', message: 'Status masih menunggu pembayaran. Cek lagi beberapa saat.' });
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
                message: `Invoice renewal dibuat: ${res.invoice.order_id}.`,
            });
            window.open(res.redirect_url ?? `/store/invoice/${res.invoice.id}`, '_blank', 'noopener,noreferrer');
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

                <ContentBox title={'Subscriptions'} css={tw`mb-6 rounded-md shadow-ds-1`}>
                    {subscriptions.length === 0 && (
                        <p css={tw`text-neutral-400 text-sm`} role={'status'}>
                            Belum ada subscription. Beli di{' '}
                            <Link to={'/store'} css={tw`text-cyan-400`}>
                                Store
                            </Link>
                            .
                        </p>
                    )}
                    {subscriptions.map((s) => (
                        <div key={s.id} css={tw`border-b border-neutral-600 py-3 last:border-0`}>
                            <div css={tw`flex justify-between items-center flex-wrap gap-2`}>
                                <div>
                                    <p css={tw`font-medium`}>
                                        #{s.id} — {s.plan?.name ?? `Plan #${s.plan_id}`}
                                        {s.server ? (
                                            <a
                                                href={`/server/${s.server.id}`}
                                                css={tw`ml-2 text-cyan-400 text-sm no-underline`}
                                            >
                                                {s.server.name}
                                            </a>
                                        ) : (
                                            <span css={tw`ml-2 text-neutral-400 text-sm`}>(tanpa server)</span>
                                        )}
                                    </p>
                                    <p css={tw`text-xs text-neutral-400`}>
                                        Expires: {s.expires_at ? new Date(s.expires_at).toLocaleString('id-ID') : '—'}
                                    </p>
                                </div>
                                <div css={tw`text-right`}>
                                    <StatusBadge status={s.status} />
                                    {canRenew(s) && (
                                        <div css={tw`mt-1`}>
                                            <Button onClick={() => onRenew(s)} aria-label={`Perpanjang subscription #${s.id}`}>
                                                Perpanjang
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </ContentBox>

                <ContentBox title={'Invoices'} css={tw`rounded-md shadow-ds-1`}>
                    {invoices.length === 0 && (
                        <p css={tw`text-neutral-400 text-sm`} role={'status'}>
                            Belum ada invoice.
                        </p>
                    )}
                    {invoices.map((i) => (
                        <div key={i.id} css={tw`border-b border-neutral-600 py-3 last:border-0`}>
                            <div css={tw`flex justify-between items-center flex-wrap gap-2`}>
                                <div>
                                    <p css={tw`font-medium text-sm`}>
                                        <code>{i.order_id}</code>{' '}
                                        <span css={tw`text-xs text-neutral-400`}>
                                            {i.type === 'renewal' ? 'perpanjangan' : 'awal'}
                                        </span>
                                    </p>
                                    <p css={tw`text-sm font-mono`}>{priceFmt(i.amount_cents)}</p>
                                </div>
                                <div css={tw`text-right`}>
                                    <StatusBadge status={i.status} />
                                    {i.status === 'pending' && (
                                        <div css={tw`mt-1 flex items-center justify-end gap-2`}>
                                            <Link
                                                to={`/store/invoice/${i.id}`}
                                                css={tw`text-cyan-400 text-sm no-underline`}
                                            >
                                                Bayar
                                            </Link>
                                            <Button
                                                onClick={() => onCheck(i)}
                                                aria-label={`Cek status invoice ${i.order_id}`}
                                            >
                                                Cek status
                                            </Button>
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
