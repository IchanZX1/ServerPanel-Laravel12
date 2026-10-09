import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useStoreState } from 'easy-peasy';
import PageContentBlock from '@/components/elements/PageContentBlock';
import EmailVerificationBanner from '@/components/elements/EmailVerificationBanner';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import FlashMessageRender from '@/components/FlashMessageRender';
import { useFlashKey } from '@/plugins/useFlash';
import { Button } from '@/components/elements/button/index';
import { Dialog } from '@/components/elements/dialog';
import MaterialIcon from '@/components/elements/MaterialIcon';
import tw from 'twin.macro';
import getBillingPlans from '@/api/billing/getBillingPlans';
import checkout from '@/api/billing/checkout';
import { BillingPlan } from '@/api/billing/types';
import { ApplicationStore } from '@/state';

/**
 * Empat kartu telemetri infrastruktur di atas daftar paket (brief-3).
 *
 * Nilai-nilainya STATIS — ini deskripsi fasilitas, bukan data dari DB. Kalau
 * nanti node/hardware mau ditampilkan dinamis, ambil dari API node dan buang
 * konstanta ini.
 */
const INFRA = [
    { label: 'Location', icon: 'public', value: 'SG-01 Equinix' },
    { label: 'Hardware', icon: 'memory', value: 'Ryzen 9 7950X' },
    { label: 'Network', icon: 'speed', value: '10 Gbps Anti-DDoS' },
    // Sengaja generik: nama gateway pembayaran tidak disebutkan di UI publik.
    { label: 'Payment Gate', icon: 'bolt', value: 'QRIS / E-Wallet / VA', tone: 'success' as const },
];

/** Baris spesifikasi di dalam blok data kartu paket. */
const SpecRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <div
        css={tw`flex justify-between items-center font-mono font-body-sm text-body-sm py-1 border-b border-muted/30 last:border-0`}
    >
        <span css={tw`text-text-muted flex items-center gap-1.5`}>
            <MaterialIcon name={icon} size={15} css={tw`text-cyan-400`} />
            {label}
        </span>
        <span css={tw`text-text-primary font-semibold`}>{value}</span>
    </div>
);

export default () => {
    const history = useHistory();
    const flashKey = 'billing-store';
    const { clearAndAddHttpError, clearFlashes } = useFlashKey(flashKey);
    const [plans, setPlans] = useState<BillingPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
    const [serverName, setServerName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    /**
     * Metode pembayaran hanya presentasional (keputusan brief: UI-only).
     * Nilainya TIDAK dikirim ke `checkout()` — gateway yang dipakai panel
     * menentukan metode di sisi server. Disimpan di state supaya radio-nya
     * tetap bisa dipilih dan terlihat seperti form sungguhan.
     */
    const [paymentMethod, setPaymentMethod] = useState<'qris' | 'va'>('qris');

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
                // Invoice punya halaman sendiri dengan QR + countdown.
                history.push(`/store/invoice/${data.invoice.id}`);
            })
            .catch(clearAndAddHttpError)
            .then(() => setSubmitting(false));
    };

    const priceFmt = (c: number) => `Rp ${c.toLocaleString('id-ID')}`;
    const diskGb = (mb: number) => Math.round(mb / 1024);

    return (
        <PageContentBlock title={'Store'}>
            <div css={tw`flex flex-col w-full`}>
                <FlashMessageRender byKey={flashKey} css={tw`mb-4`} />
                <EmailVerificationBanner />

                {/* ---- Header halaman ---- */}
                <section css={tw`flex flex-col gap-space-sm mb-space-lg`}>
                    <div css={tw`flex flex-wrap items-center gap-3`}>
                        <h1 css={tw`font-headline-lg text-headline-lg text-text-primary tracking-tight`}>Store</h1>
                        <span
                            css={tw`flex items-center gap-space-sm bg-surface-card px-space-md py-space-xs rounded-xl shadow-sm`}
                        >
                            <span css={tw`inline-block w-2 h-2 rounded-full bg-success animate-pulse`} />
                            <span css={tw`font-label-sm text-label-sm text-text-secondary`}>
                                Instant Deployment System v3.8
                            </span>
                        </span>
                    </div>
                    <p css={tw`font-body-lg text-body-lg text-text-secondary max-w-3xl`}>
                        Beli server game &amp; cloud hosting dengan aktivasi otomatis instan setelah pembayaran
                        terverifikasi.
                    </p>

                    <div css={tw`grid grid-cols-2 md:grid-cols-4 gap-space-sm mt-space-sm`}>
                        {INFRA.map((item) => (
                            <div
                                key={item.label}
                                css={tw`bg-surface-card rounded-lg p-space-sm flex items-center justify-between shadow-sm gap-2`}
                            >
                                <span
                                    css={tw`font-label-micro text-label-micro text-text-muted uppercase flex-shrink-0`}
                                >
                                    {item.label}
                                </span>
                                <span
                                    css={tw`font-label-sm text-label-sm text-text-primary font-mono flex items-center gap-1 min-w-0`}
                                >
                                    <MaterialIcon
                                        name={item.icon}
                                        size={14}
                                        css={item.tone === 'success' ? tw`text-success` : tw`text-brand`}
                                    />
                                    <span css={tw`truncate`}>{item.value}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ---- Flash bar / status sistem ---- */}
                <div
                    css={tw`bg-surface-container-low rounded-xl p-space-md mb-space-lg flex items-center justify-between shadow-sm gap-4`}
                >
                    <div css={tw`flex items-center gap-space-sm min-w-0`}>
                        <div
                            css={tw`w-8 h-8 rounded-lg bg-brand-container/20 flex items-center justify-center text-brand flex-shrink-0`}
                        >
                            <MaterialIcon name={'local_fire_department'} />
                        </div>
                        <div css={tw`min-w-0`}>
                            <p css={tw`font-label-md text-label-md text-text-primary truncate`}>
                                Alokasi NVMe Gen4 siap pakai dengan latensi rata-rata 14ms ke Indonesia.
                            </p>
                            <p css={tw`font-body-sm text-body-sm text-text-muted`}>
                                Aktivasi otomatis rata-rata selesai dalam waktu 38 detik.
                            </p>
                        </div>
                    </div>
                    <span
                        css={tw`hidden sm:inline-flex font-label-micro text-label-micro px-2 py-1 rounded bg-surface-container-high text-cyan-400 font-mono flex-shrink-0`}
                    >
                        ONLINE 99.98%
                    </span>
                </div>

                {/* ---- Daftar paket ---- */}
                <div css={tw`relative`}>
                    <SpinnerOverlay visible={loading} />

                    <div css={tw`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-space-xl`}>
                        {plans.length === 0 && !loading && (
                            <p css={tw`font-body-md text-body-md text-text-muted`} role={'status'}>
                                Belum ada paket billing aktif.
                            </p>
                        )}
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                css={tw`flex flex-col justify-between bg-surface-card rounded-xl p-space-md shadow-md transition-all duration-300 hover:bg-surface-hover hover:shadow-xl`}
                            >
                                <div>
                                    <h3
                                        css={tw`font-headline-sm text-headline-sm text-text-primary font-semibold mb-space-xs`}
                                    >
                                        {plan.name}
                                    </h3>
                                    {plan.description && (
                                        <p
                                            css={tw`font-body-sm text-body-sm text-text-secondary min-h-[40px] mb-space-md break-words`}
                                        >
                                            {plan.description}
                                        </p>
                                    )}

                                    <div
                                        css={tw`bg-surface-container-lowest rounded-lg p-space-sm flex flex-col mb-space-md`}
                                    >
                                        <SpecRow icon={'memory_alt'} label={'Memory'} value={`${plan.memory} MB`} />
                                        <SpecRow icon={'speed'} label={'CPU'} value={`${plan.cpu}%`} />
                                        <SpecRow icon={'hard_drive'} label={'Disk'} value={`${plan.disk} MB`} />
                                        <SpecRow
                                            icon={'schedule'}
                                            label={'Duration'}
                                            value={`${plan.duration_days} hari`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div css={tw`flex items-baseline gap-1 mb-4`}>
                                        <span
                                            css={tw`font-headline-md text-headline-md text-cyan-400 font-mono font-bold tracking-tight`}
                                        >
                                            {priceFmt(plan.price_cents)}
                                        </span>
                                        <span css={tw`font-body-sm text-body-sm text-text-muted`}>
                                            / {plan.duration_days} hari
                                        </span>
                                    </div>
                                    <button
                                        type={'button'}
                                        onClick={() => setSelectedPlan(plan)}
                                        aria-label={`Beli paket ${plan.name}`}
                                        css={tw`w-full bg-cyan-600 hover:bg-cyan-500 text-text-primary font-label-md text-label-md font-semibold py-2.5 rounded-lg transition-all shadow-[0_0_12px_rgba(8,145,178,0.25)] flex items-center justify-center gap-2`}
                                    >
                                        <MaterialIcon name={'shopping_cart_checkout'} size={18} />
                                        Beli Paket
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <StoreFooter />
            </div>

            {/* ---- Modal checkout ---- */}
            <Dialog
                open={!!selectedPlan}
                onClose={() => {
                    if (!submitting) {
                        setSelectedPlan(null);
                        setServerName('');
                    }
                }}
                title={''}
                preventExternalClose={submitting}
            >
                <div css={tw`flex flex-col gap-space-md`}>
                    {/* Glow tepi atas modal (brief-3). */}
                    <div
                        css={tw`h-1 w-full rounded-full bg-gradient-to-r from-cyan-600 via-brand to-cyan-400`}
                        aria-hidden={'true'}
                    />

                    <div css={tw`flex items-center gap-space-xs`}>
                        <MaterialIcon name={'shopping_bag'} size={22} css={tw`text-brand`} />
                        <h3 css={tw`font-headline-sm text-headline-sm text-text-primary`}>
                            {selectedPlan ? `Beli ${selectedPlan.name}` : ''}
                        </h3>
                    </div>

                    {selectedPlan && (
                        <div
                            css={tw`bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between gap-4`}
                        >
                            <div css={tw`min-w-0`}>
                                <span
                                    css={tw`font-label-micro text-label-micro text-text-muted uppercase block`}
                                >
                                    Alokasi Resource
                                </span>
                                <p css={tw`font-mono font-label-sm text-label-sm text-text-primary`}>
                                    {selectedPlan.memory} MB RAM / {selectedPlan.cpu}% CPU /{' '}
                                    {diskGb(selectedPlan.disk)} GB Disk
                                </p>
                            </div>
                            <div css={tw`text-right flex-shrink-0`}>
                                <span
                                    css={tw`font-label-micro text-label-micro text-text-muted uppercase block`}
                                >
                                    Total Tagihan
                                </span>
                                <p css={tw`font-mono font-headline-sm text-headline-sm text-cyan-400 font-bold`}>
                                    {priceFmt(selectedPlan.price_cents)}
                                </p>
                            </div>
                        </div>
                    )}

                    <form id={'billing-checkout-form'} onSubmit={onCheckout} noValidate css={tw`flex flex-col gap-space-md`}>
                        <div css={tw`flex flex-col gap-1.5`}>
                            <label
                                className={'block'}
                                htmlFor={'billing-server-name'}
                                css={tw`font-label-md text-label-md text-text-primary flex items-center justify-between`}
                            >
                                <span>
                                    Nama Server <span css={tw`text-danger`}>*</span>
                                </span>
                                <span css={tw`font-label-micro text-label-micro text-text-muted`}>
                                    Identifier Pterodactyl
                                </span>
                            </label>
                            <div css={tw`relative`}>
                                <MaterialIcon
                                    name={'dns'}
                                    size={18}
                                    css={tw`absolute left-3 top-3 text-text-muted pointer-events-none`}
                                />
                                <input
                                    id={'billing-server-name'}
                                    type={'text'}
                                    placeholder={'mis. My Server'}
                                    value={serverName}
                                    aria-invalid={serverName.length > 0 && !nameValid}
                                    aria-describedby={'billing-server-name-error'}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setServerName(e.currentTarget.value)
                                    }
                                    css={tw`w-full bg-surface-container-lowest text-text-primary placeholder:text-text-muted font-body-md text-body-md rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-brand transition-all`}
                                />
                            </div>
                            {!nameValid && serverName.length > 0 ? (
                                <span
                                    id={'billing-server-name-error'}
                                    role={'alert'}
                                    css={tw`font-body-sm text-body-sm text-danger flex items-center gap-1.5`}
                                >
                                    <MaterialIcon name={'error'} size={14} />
                                    Nama server minimal 3 karakter.
                                </span>
                            ) : (
                                <span css={tw`font-body-sm text-body-sm text-text-muted flex items-center gap-1.5`}>
                                    <MaterialIcon name={'info'} size={14} css={tw`text-brand`} />
                                    Nama server dapat diganti kapan saja melalui dashboard admin.
                                </span>
                            )}
                        </div>

                        {/*
                         * Metode pembayaran — PRESENTASIONAL SAJA.
                         * Radio ini tidak memengaruhi `checkout()`; gateway
                         * menentukan metode di sisi server. Dipasang untuk
                         * memenuhi brief-3, bukan sebagai pilihan fungsional.
                         */}
                        <div css={tw`flex flex-col gap-1.5`}>
                            <span css={tw`font-label-md text-label-md text-text-primary`}>Metode Pembayaran</span>
                            <div css={tw`grid grid-cols-1 sm:grid-cols-2 gap-2`}>
                                {(
                                    [
                                        { value: 'qris', label: 'QRIS Instant (All E-Wallet)' },
                                        { value: 'va', label: 'Virtual Account (BCA/BRI/Mandiri)' },
                                    ] as const
                                ).map((method) => (
                                    <label
                                        key={method.value}
                                        css={tw`flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-lowest cursor-pointer hover:bg-surface-hover transition-colors`}
                                    >
                                        <input
                                            type={'radio'}
                                            name={'payment_method'}
                                            value={method.value}
                                            checked={paymentMethod === method.value}
                                            onChange={() => setPaymentMethod(method.value)}
                                            className={'accent-cyan-500'}
                                        />
                                        <span css={tw`font-label-sm text-label-sm text-text-primary`}>
                                            {method.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div
                            css={tw`p-space-sm rounded-lg bg-surface-container-low flex items-start gap-2.5 text-text-secondary font-body-sm text-body-sm`}
                        >
                            <MaterialIcon name={'timer'} size={18} css={tw`text-cyan-400 flex-shrink-0 mt-0.5`} />
                            <span>
                                Sisa waktu pembayaran tampil di halaman invoice. Server dibuat otomatis setelah
                                pembayaran terverifikasi.
                            </span>
                        </div>

                        <Dialog.Footer>
                            <Button.Text
                                type={'button'}
                                onClick={() => setSelectedPlan(null)}
                                disabled={submitting}
                            >
                                Batal
                            </Button.Text>
                            <Button type={'submit'} form={'billing-checkout-form'} disabled={!nameValid || submitting}>
                                {submitting ? (
                                    <>
                                        <MaterialIcon name={'sync'} size={18} css={tw`animate-spin`} />
                                        Memproses…
                                    </>
                                ) : (
                                    <>
                                        <MaterialIcon name={'receipt'} size={18} />
                                        Buat Invoice
                                    </>
                                )}
                            </Button>
                        </Dialog.Footer>
                    </form>
                </div>
            </Dialog>
        </PageContentBlock>
    );
};

/**
 * Footer sistem (brief-3). Versi panel diambil dari `settings.version` yang
 * dikirim AssetComposer — bukan string hardcode mockup, supaya tidak basi
 * setiap panel di-upgrade.
 */
const StoreFooter = () => (
    <footer
        css={tw`pt-space-md pb-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-sm text-text-muted font-body-sm text-body-sm`}
    >
        <div css={tw`flex items-center gap-2`}>
            <MaterialIcon name={'terminal'} size={16} css={tw`text-text-muted`} />
            <span>Pterodactyl® © 2015 - 2026</span>
        </div>
        <div css={tw`flex items-center gap-space-md font-mono text-[11px]`}>
            <PanelVersion />
            <span css={tw`text-success flex items-center gap-1`}>
                <span css={tw`w-1.5 h-1.5 rounded-full bg-success`} /> CLOUD SYNCED
            </span>
        </div>
    </footer>
);

const PanelVersion = () => {
    // Versi asli dari config, bukan string mockup (keputusan #6).
    const version = useStoreState((state: ApplicationStore) => state.settings.data?.version);

    return <span>{version ? `PANEL: ${version}` : 'PANEL: —'}</span>;
};
