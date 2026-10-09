import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MaterialIcon from '@/components/elements/MaterialIcon';
import tw from 'twin.macro';
import getBillingSubscriptions from '@/api/billing/getBillingSubscriptions';
import { BillingSubscription } from '@/api/billing/types';
import { ServerContext } from '@/state/server';

const pad = (n: number): string => String(n).padStart(2, '0');

/** Sisa waktu "3 hari 4 jam" / "2:05" — dihitung dari nowMs yang tick tiap detik. */
function formatRemaining(ms: number): string {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    if (d > 0) return `${d} hari ${h} jam ${m} mnt`;
    if (h > 0) return `${h} jam ${m} mnt ${pad(sec)} dtk`;
    return `${m}:${pad(sec)}`;
}

/**
 * Banner billing di paling atas halaman /server/:id/*.
 * Menampilkan status subscription + countdown realtime (tick 1 detik),
 * dengan refresh data tiap 60 detik supaya tetap akurat.
 * Tidak render apa-apa bila server ini tidak terikat subscription billing.
 */
export default () => {
    const internalId = ServerContext.useStoreState((state) => state.server.data?.internalId);
    const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        if (!internalId) return;

        let cancelled = false;
        const fetchSub = () => {
            getBillingSubscriptions()
                .then((page) => {
                    if (cancelled) return;
                    setSubscription(page.items.find((s) => s.server?.id === internalId) ?? null);
                })
                .catch(() => {
                    // Banner pelengkap: gagal fetch = sembunyikan, jangan ganggu halaman server.
                    if (!cancelled) setSubscription(null);
                });
        };

        fetchSub();
        const poll = window.setInterval(fetchSub, 60000);

        return () => {
            cancelled = true;
            window.clearInterval(poll);
        };
    }, [internalId]);

    // Countdown realtime tiap detik.
    useEffect(() => {
        if (!subscription) return;
        const t = window.setInterval(() => setNowMs(Date.now()), 1000);

        return () => window.clearInterval(t);
    }, [subscription]);

    if (!subscription) return null;

    const pendingInvoice =
        subscription.pending_invoice && subscription.pending_invoice.status === 'pending'
            ? subscription.pending_invoice
            : null;
    const expiresMs = subscription.expires_at ? new Date(subscription.expires_at).getTime() : null;
    const expired = expiresMs !== null && expiresMs - nowMs <= 0;

    const kind = subscription.status === 'suspended' || expired ? 'danger' : subscription.status === 'pending_payment' ? 'warn' : 'ok';
    const icon = kind === 'ok' ? 'verified' : kind === 'warn' ? 'schedule' : 'warning';

    return (
        <div
            role={'timer'}
            aria-label={'Status billing server'}
            css={[
                tw`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 mb-5 rounded-lg font-body-md text-body-md shadow-sm`,
                kind === 'ok' && tw`bg-success-bg text-success`,
                kind === 'warn' && tw`bg-warning-bg text-warning`,
                kind === 'danger' && tw`bg-danger-bg text-danger`,
            ]}
        >
            <span css={tw`inline-flex items-center gap-2`}>
                <MaterialIcon name={icon} size={20} />
                {kind === 'ok' && (
                    <>
                        Billing aktif
                        {expiresMs !== null && (
                            <span css={tw`font-mono`}>— sisa {formatRemaining(expiresMs - nowMs)}</span>
                        )}
                    </>
                )}
                {kind === 'warn' && <>Menunggu pembayaran — selesaikan sebelum server ditangguhkan</>}
                {kind === 'danger' && <>Masa aktif habis — perpanjang untuk mengaktifkan kembali</>}
            </span>
            <span css={tw`inline-flex items-center gap-3`}>
                {expiresMs !== null && kind === 'ok' && (
                    <span css={tw`font-label-sm text-label-sm opacity-80`}>
                        hingga{' '}
                        {new Date(expiresMs).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        })}
                    </span>
                )}
                {pendingInvoice ? (
                    <Link
                        to={`/store/invoice/${pendingInvoice.id}`}
                        css={[
                            tw`inline-flex items-center gap-1 px-3 py-1 rounded font-label-sm text-label-sm font-semibold no-underline transition-colors`,
                            kind === 'ok' && tw`bg-success/20 hover:bg-success/30`,
                            kind === 'warn' && tw`bg-warning/20 hover:bg-warning/30`,
                            kind === 'danger' && tw`bg-danger/20 hover:bg-danger/30`,
                        ]}
                    >
                        Bayar sekarang
                        <MaterialIcon name={'arrow_forward'} size={14} />
                    </Link>
                ) : (
                    <Link
                        to={'/account/billing'}
                        css={[
                            tw`inline-flex items-center gap-1 px-3 py-1 rounded font-label-sm text-label-sm font-semibold no-underline transition-colors`,
                            kind === 'ok' && tw`bg-success/20 hover:bg-success/30`,
                            kind === 'warn' && tw`bg-warning/20 hover:bg-warning/30`,
                            kind === 'danger' && tw`bg-danger/20 hover:bg-danger/30`,
                        ]}
                    >
                        Billing
                        <MaterialIcon name={'arrow_forward'} size={14} />
                    </Link>
                )}
            </span>
        </div>
    );
};
