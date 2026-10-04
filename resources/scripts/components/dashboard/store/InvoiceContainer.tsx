import React, { useEffect, useRef, useState } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import PageContentBlock from '@/components/elements/PageContentBlock';
import ContentBox from '@/components/elements/ContentBox';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import FlashMessageRender from '@/components/FlashMessageRender';
import { useFlashKey } from '@/plugins/useFlash';
import useFlash from '@/plugins/useFlash';
import { Button } from '@/components/elements/button/index';
import tw from 'twin.macro';
import QRCode from 'qrcode.react';
import getInvoiceDetail from '@/api/billing/getInvoiceDetail';
import checkInvoice from '@/api/billing/checkInvoice';
import { InvoiceDetailResponse } from '@/api/billing/types';

function formatCountdown(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const r = s % 60;

    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function renderQR(qr: string | null) {
    if (!qr) return null;
    if (qr.startsWith('data:image')) return <img src={qr} alt={'QR Code'} css={tw`max-w-[240px] mx-auto rounded`} />;
    if (qr.startsWith('http')) return <img src={qr} alt={'QR Code'} css={tw`max-w-[240px] mx-auto rounded`} />;
    if (/^[A-Za-z0-9+/=]{100,}$/.test(qr.replace(/\s/g, '')))
        return <img src={`data:image/png;base64,${qr}`} alt={'QR Code'} css={tw`max-w-[240px] mx-auto rounded`} />;

    return (
        <div css={tw`text-center`}>
            <QRCode renderAs={'svg'} value={qr} size={220} css={tw`mx-auto rounded bg-white p-2`} />
            <p css={tw`font-mono text-[10px] break-all bg-neutral-900 p-2 rounded mt-2 text-left`}>{qr}</p>
        </div>
    );
}

export default () => {
    const { invoiceId } = useParams<{ invoiceId: string }>();
    const history = useHistory();
    const flashKey = `billing-invoice-${invoiceId}`;
    const { clearAndAddHttpError, clearFlashes } = useFlashKey(flashKey);
    const { addFlash } = useFlash();

    const [detail, setDetail] = useState<InvoiceDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const loadedRef = useRef(false);

    const id = Number.parseInt(invoiceId, 10);

    const refresh = async () => {
        if (!Number.isFinite(id)) return;

        try {
            const data = await getInvoiceDetail(id);
            setDetail(data);
            // Fallback: bila halaman dibuka setelah expired tanpa membayar,
            // tampilkan pesan agar tidak blank.
            if (!data.can_pay && data.invoice.status === 'expired') {
                addFlash({
                    key: flashKey,
                    type: 'error',
                    message: 'Link invoice sudah expired. Buat checkout baru di Store.',
                });
            }
        } catch (err: any) {
            clearAndAddHttpError(err);
        } finally {
            setLoading(false);
            loadedRef.current = true;
        }
    };

    useEffect(() => {
        setLoading(true);
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoiceId]);

    // Countdown tiap detik.
    useEffect(() => {
        const t = window.setInterval(() => setNowMs(Date.now()), 1000);

        return () => window.clearInterval(t);
    }, []);

    // Ketika deadline lewat, fetch ulang sekali untuk dapat status expired + clear payload.
    const expiresAtMs = detail?.expires_at ? new Date(detail.expires_at).getTime() : null;
    const remainingSec =
        detail?.can_pay && expiresAtMs !== null ? Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000)) : null;
    const isCountdownExpired = remainingSec !== null && remainingSec <= 0;

    useEffect(() => {
        if (!isCountdownExpired || !detail?.can_pay) return;
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCountdownExpired]);

    const onCheckPayment = async () => {
        setChecking(true);
        clearFlashes();
        try {
            await checkInvoice(id);
            addFlash({ key: flashKey, type: 'success', message: 'Verifikasi dimulai, cek lagi beberapa saat.' });
            await refresh();
        } catch (err: any) {
            clearAndAddHttpError(err);
        }
        setChecking(false);
    };

    if (loading && !loadedRef.current) {
        return (
            <PageContentBlock title={'Invoice'}>
                <FlashMessageRender byKey={flashKey} css={tw`mb-4`} />
                <SpinnerOverlay visible />
            </PageContentBlock>
        );
    }

    if (!detail) {
        return (
            <PageContentBlock title={'Invoice'}>
                <FlashMessageRender byKey={flashKey} css={tw`mb-4`} />
                <ContentBox>Invoice tidak ditemukan.</ContentBox>
                <div css={tw`mt-4`}>
                    <Link to={'/store'} css={tw`text-cyan-400 no-underline`}>Kembali ke Store</Link>
                </div>
            </PageContentBlock>
        );
    }

    const invoice = detail.invoice;
    const paid = invoice.status === 'paid';
    const expired = invoice.status === 'expired' || (isCountdownExpired ?? false);
    const canPay = detail.can_pay && !expired;

    return (
        <PageContentBlock title={`Invoice #${invoice.order_id}`}>
            <FlashMessageRender byKey={flashKey} css={tw`mb-4`} />
            <div css={tw`relative`}>
                <SpinnerOverlay visible={checking} />
                <ContentBox title={`Invoice ${invoice.order_id}`} css={tw`mb-6`}>
                    <div css={tw`space-y-3`}>
                        <div css={tw`grid grid-cols-2 gap-2 text-sm`}>
                            <div css={tw`text-neutral-400`}>Order ID</div>
                            <div css={tw`font-mono`}>{invoice.order_id}</div>
                            <div css={tw`text-neutral-400`}>Nominal</div>
                            <div>Rp {invoice.amount_cents.toLocaleString('id-ID')}</div>
                            <div css={tw`text-neutral-400`}>Status</div>
                            <div
                                css={[
                                    tw`font-medium`,
                                    paid ? tw`text-green-400` : expired ? tw`text-red-400` : tw`text-yellow-400`,
                                ]}
                            >
                                {invoice.status}
                            </div>
                            {detail.subscription && (
                                <>
                                    <div css={tw`text-neutral-400`}>Server</div>
                                    <div>{detail.subscription.server?.name ?? '(akan dibuat setelah pembayaran)'}</div>
                                </>
                            )}
                        </div>

                        {canPay && remainingSec !== null && (
                            <div css={tw`rounded bg-neutral-900 p-3 text-center`}>
                                <p css={tw`text-xs text-neutral-500`}>Bayar sebelum countdown habis</p>
                                <p css={tw`text-3xl font-mono font-bold text-cyan-400`}>{formatCountdown(remainingSec)}</p>
                                <p css={tw`text-xs text-neutral-500`}>Invoice hanya berlaku 3 menit dari dibuat.</p>
                            </div>
                        )}

                        {canPay && renderQR(detail.qr_string)}

                        <div css={tw`flex flex-col gap-2`}>
                            {canPay && detail.redirect_url && (
                                <a
                                    href={detail.redirect_url}
                                    target={'_blank'}
                                    rel={'noreferrer'}
                                    css={tw`block text-center bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded no-underline`}
                                >
                                    Buka Halaman Pembayaran
                                </a>
                            )}
                            {canPay && (
                                <Button onClick={onCheckPayment} disabled={checking} className={'w-full'}>
                                    {checking ? 'Mengecek...' : 'Saya sudah bayar'}
                                </Button>
                            )}
                            {paid && (
                                <p css={tw`text-sm text-green-400`}>Pembayaran berhasil. Server sedang dibuat — lihat di <Link to={'/account/billing'} css={tw`text-cyan-400`}>Billing</Link>.</p>
                            )}
                            {expired && (
                                <div css={tw`rounded bg-red-900/40 border border-red-800 p-3 text-sm`}>
                                    Link invoice expired. Buat kembali dari <Link to={'/store'} css={tw`text-cyan-400`}>Store</Link>.
                                </div>
                            )}
                            {!canPay && !paid && !expired && (
                                <p css={tw`text-sm text-neutral-400`}>Invoice tidak dapat dibayar lagi.</p>
                            )}
                        </div>
                    </div>
                </ContentBox>
                <div css={tw`mt-4 flex gap-4`}>
                    <Link to={'/store'} css={tw`text-cyan-400 no-underline text-sm`}>← Kembali ke Store</Link>
                    <Link to={'/account/billing'} css={tw`text-neutral-400 no-underline text-sm`}>Lihat Billing</Link>
                </div>
            </div>
        </PageContentBlock>
    );
};