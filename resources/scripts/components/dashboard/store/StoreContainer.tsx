import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import PageContentBlock from '@/components/elements/PageContentBlock';
import ContentBox from '@/components/elements/ContentBox';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import FlashMessageRender from '@/components/FlashMessageRender';
import { useFlashKey } from '@/plugins/useFlash';
import { Button } from '@/components/elements/button/index';
import { Dialog } from '@/components/elements/dialog';
import { Input } from '@/components/elements/inputs';
import tw from 'twin.macro';
import getBillingPlans from '@/api/billing/getBillingPlans';
import checkout from '@/api/billing/checkout';
import { BillingPlan } from '@/api/billing/types';

export default () => {
    const history = useHistory();
    const flashKey = 'billing-store';
    const { clearAndAddHttpError, clearFlashes } = useFlashKey(flashKey);
    const [plans, setPlans] = useState<BillingPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
    const [serverName, setServerName] = useState('');
    const [submitting, setSubmitting] = useState(false);

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
                // Invoice punya halaman sendiri dengan countdown 3 menit.
                history.push(`/store/invoice/${data.invoice.id}`);
            })
            .catch(clearAndAddHttpError)
            .then(() => setSubmitting(false));
    };

    const priceFmt = (c: number) => `Rp ${c.toLocaleString('id-ID')}`;

    return (
        <PageContentBlock title={'Store'}>
            <FlashMessageRender byKey={flashKey} css={tw`mb-4`} />
            <div css={tw`relative`}>
                <SpinnerOverlay visible={loading} />

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
                        Invoice berlaku 3 menit. Server dibuat otomatis setelah pembayaran terverifikasi.
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