import React, { useEffect, useState } from 'react';
import PageContentBlock from '@/components/elements/PageContentBlock';
import ContentBox from '@/components/elements/ContentBox';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import FlashMessageRender from '@/components/FlashMessageRender';
import { useFlashKey } from '@/plugins/useFlash';
import useFlash from '@/plugins/useFlash';
import { Button } from '@/components/elements/button/index';
import { Dialog } from '@/components/elements/dialog';
import { Input } from '@/components/elements/inputs';
import tw from 'twin.macro';
import QRCode from 'qrcode.react';
import getBillingPlans from '@/api/billing/getBillingPlans';
import checkout from '@/api/billing/checkout';
import checkInvoice from '@/api/billing/checkInvoice';
import { BillingPlan, CheckoutResponse } from '@/api/billing/types';

export default () => {
    const flashKey = 'billing-store';
    const { clearAndAddHttpError, clearFlashes } = useFlashKey(flashKey);
    const { addFlash } = useFlash();
    const [plans, setPlans] = useState<BillingPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
    const [serverName, setServerName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        getBillingPlans()
            .then(setPlans)
            .catch(clearAndAddHttpError)
            .then(() => setLoading(false));
    }, []);

    const nameValid = serverName.trim().length >= 3;

    const onCheckout = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (!selectedPlan || !nameValid || submitting) return;

        setSubmitting(true);
        clearFlashes();
        checkout(selectedPlan.id, serverName.trim())
            .then((data) => {
                setCheckoutData(data);
                addFlash({ key: flashKey, type: 'success', message: 'Invoice dibuat. Silakan bayar melalui link dibawah.' });
                setSelectedPlan(null);
                setServerName('');
            })
            .catch(clearAndAddHttpError)
            .then(() => setSubmitting(false));
    };

    const onCheckPayment = async () => {
        if (!checkoutData) return;
        setChecking(true);
        try {
            const res = await checkInvoice(checkoutData.invoice.id);
            if (res.invoice?.status === 'paid') {
                addFlash({ key: flashKey, type: 'success', message: 'Pembayaran diterima! Server sedang dibuat.' });
            } else if (res.invoice?.status === 'expired') {
                addFlash({ key: flashKey, type: 'error', message: 'Invoice expired — silakan checkout lagi.' });
                setCheckoutData({ ...checkoutData, invoice: res.invoice });
            } else {
                addFlash({ key: flashKey, type: 'info', message: 'Status: pending — cek lagi beberapa saat. Invoice gateway expired ~3 menit.' });
            }
        } catch (err: any) {
            clearAndAddHttpError(err);
        }
        setChecking(false);
    };

    const renderQR = (qr: string | null) => {
        if (!qr) return null;
        // Maelyn kirim base64 PNG langsung atau payload EMV/QRIS mentah (00020101...).
        if (qr.startsWith('data:image')) return <img src={qr} alt="QR Code" css={tw`max-w-[240px] mx-auto rounded`} />;
        if (qr.startsWith('http')) return <img src={qr} alt="QR Code" css={tw`max-w-[240px] mx-auto rounded`} />;
        if (/^[A-Za-z0-9+/=]{100,}$/.test(qr.replace(/\s/g, '')))
            return <img src={`data:image/png;base64,${qr}`} alt="QR Code" css={tw`max-w-[240px] mx-auto rounded`} />;

        return (
            <div css={tw`text-center`}>
                <QRCode renderAs={'svg'} value={qr} size={220} css={tw`mx-auto rounded bg-white p-2`} />
                <p css={tw`font-mono text-[10px] break-all bg-neutral-900 p-2 rounded mt-2 text-left`}>{qr}</p>
            </div>
        );
    };

    const priceFmt = (c: number) => `Rp ${c.toLocaleString('id-ID')}`;

    return (
        <PageContentBlock title={'Store'}>
            <FlashMessageRender byKey={flashKey} css={tw`mb-4`} />
            <div css={tw`relative`}>
                <SpinnerOverlay visible={loading} />

                {checkoutData && (
                    <ContentBox title={'Pembayaran'} css={tw`mb-6`}>
                        <p css={tw`text-sm text-neutral-300 mb-2`}>
                            Order <code>{checkoutData.invoice.order_id}</code>
                        </p>
                        {renderQR(checkoutData.qr_string)}
                        <div css={tw`mt-4 space-y-2`}>
                            <a
                                href={checkoutData.redirect_url}
                                target={'_blank'}
                                rel={'noreferrer'}
                                css={tw`block text-center bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded no-underline`}
                            >
                                Buka Halaman Pembayaran
                            </a>
                            <Button onClick={onCheckPayment} disabled={checking} className={'w-full'}>
                                {checking ? 'Mengecek...' : 'Saya sudah bayar'}
                            </Button>
                            <Button.Text onClick={() => setCheckoutData(null)} className={'w-full'}>
                                Tutup
                            </Button.Text>
                            <p css={tw`text-xs text-neutral-500`}>
                                Invoice gateway expired ~3 menit. Status invoice: {checkoutData.invoice.status}
                            </p>
                        </div>
                    </ContentBox>
                )}

                <div css={tw`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
                    {plans.length === 0 && !loading && <p css={tw`text-neutral-400`}>Belum ada paket billing aktif.</p>}
                    {plans.map((plan) => (
                        <ContentBox key={plan.id} title={plan.name} css={tw`flex flex-col`}>
                            {plan.description && <p css={tw`text-sm text-neutral-400 mb-2`}>{plan.description}</p>}
                            <div css={tw`text-sm space-y-1 mb-3`}>
                                <div css={tw`flex justify-between`}>
                                    <span>Memory</span>
                                    <span>{plan.memory} MB</span>
                                </div>
                                <div css={tw`flex justify-between`}>
                                    <span>CPU</span>
                                    <span>{plan.cpu}%</span>
                                </div>
                                <div css={tw`flex justify-between`}>
                                    <span>Disk</span>
                                    <span>{plan.disk} MB</span>
                                </div>
                                <div css={tw`flex justify-between`}>
                                    <span>Duration</span>
                                    <span>{plan.duration_days} hari</span>
                                </div>
                            </div>
                            <div css={tw`mt-auto`}>
                                <p css={tw`text-xl font-bold text-cyan-400 mb-3`}>{priceFmt(plan.price_cents)}</p>
                                <Button onClick={() => setSelectedPlan(plan)} className={'w-full'}>
                                    Beli
                                </Button>
                            </div>
                        </ContentBox>
                    ))}
                </div>
            </div>

            <Dialog
                open={!!selectedPlan}
                onClose={() => {
                    if (!submitting) {
                        setSelectedPlan(null);
                        setServerName('');
                    }
                }}
                title={selectedPlan ? `Beli ${selectedPlan.name}` : ''}
                preventExternalClose={submitting}
            >
                <form id={'billing-checkout-form'} className={'mt-6'} onSubmit={onCheckout}>
                    <label className={'block pb-1'} htmlFor={'billing-server-name'}>
                        Nama server
                    </label>
                    <Input.Text
                        id={'billing-server-name'}
                        type={'text'}
                        variant={Input.Text.Variants.Loose}
                        placeholder={'mis. My Server'}
                        value={serverName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setServerName(e.currentTarget.value)}
                    />
                    {!nameValid && serverName.length > 0 && (
                        <p css={tw`text-red-400 text-xs mt-2`}>Nama server minimal 3 karakter.</p>
                    )}
                    <p css={tw`text-neutral-400 text-xs mt-2`}>
                        Server akan dibuat otomatis setelah pembayaran terverifikasi.
                    </p>
                    <Dialog.Footer>
                        <Button.Text type={'button'} onClick={() => setSelectedPlan(null)} disabled={submitting}>
                            Batal
                        </Button.Text>
                        <Button type={'submit'} form={'billing-checkout-form'} disabled={!nameValid || submitting}>
                            {submitting ? 'Memproses...' : 'Buat Invoice'}
                        </Button>
                    </Dialog.Footer>
                </form>
            </Dialog>
        </PageContentBlock>
    );
};