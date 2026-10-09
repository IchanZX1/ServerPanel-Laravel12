import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageContentBlock from '@/components/elements/PageContentBlock';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import FlashMessageRender from '@/components/FlashMessageRender';
import CopyOnClick from '@/components/elements/CopyOnClick';
import MaterialIcon from '@/components/elements/MaterialIcon';
import { useFlashKey } from '@/plugins/useFlash';
import useFlash from '@/plugins/useFlash';
import { Button } from '@/components/elements/button/index';
import tw from 'twin.macro';
import QRCode from 'qrcode.react';
import getInvoiceDetail from '@/api/billing/getInvoiceDetail';
import checkInvoice from '@/api/billing/checkInvoice';
import { InvoiceDetailResponse } from '@/api/billing/types';

/** Total detik untuk progress ring countdown. */
const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Interval auto-poll status pembayaran. Cukup jarang untuk tidak membebani API,
 * cukup sering untuk terasa "hidup" setelah pembeli selesai scan.
 */
const POLL_INTERVAL_MS = 5000;

function formatClock(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);

    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function formatTime(iso: string | null): string {
    if (!iso) return '—';

    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatRupiah(value: number): string {
    return `Rp ${value.toLocaleString('id-ID')}`;
}

/**
 * Render QR pembayaran. String mentah payload TIDAK pernah ditampilkan —
 * kalau gateway mengirim payload non-gambar yang tidak bisa dirender,
 * tampilkan info bahwa QR tidak tersedia.
 */
function PaymentQR({ value }: { value: string | null }) {
    if (!value) {
        return (
            <div
                role={'status'}
                css={tw`flex flex-col items-center justify-center gap-3 w-52 h-52 sm:w-60 sm:h-60 mx-auto rounded-lg border border-dashed border-strong bg-surface-container-lowest`}
            >
                <MaterialIcon name={'qr_code_2'} size={32} css={tw`text-text-muted`} />
                <p css={tw`font-body-sm text-body-sm text-text-secondary text-center px-4`}>
                    QR tidak tersedia. Hubungi admin untuk menyelesaikan pembayaran.
                </p>
            </div>
        );
    }

    // Deteksi gambar secara ketat. Base64 payload pembayaran bukan gambar, jadi
    // TIDAK boleh dicocokkan dengan pola alfanumerik generik: string QR EMVCo
    // (mis. "00020101021226...") juga alfanumerik dan panjang, dan akan berakhir
    // sebagai <img> rusak. Hanya signature PNG/JPEG yang dianggap gambar.
    const isImageUrl = value.startsWith('data:image') || value.startsWith('http');
    const stripped = value.replace(/\s/g, '');
    const isImageBase64 = stripped.startsWith('iVBORw0KGgo') || stripped.startsWith('/9j/');

    return (
        <div css={tw`flex justify-center`}>
            {/* Kartu putih: QR wajib punya quiet zone kontras tinggi agar bisa
                dipindai dari layar gelap. Jangan diubah jadi kartu gelap. */}
            <div css={tw`p-4 bg-white rounded-xl shadow-2xl`}>
                {isImageUrl || isImageBase64 ? (
                    <img
                        src={isImageUrl ? value : `data:image/png;base64,${stripped}`}
                        alt={'QR Code pembayaran'}
                        css={tw`block w-52 h-52 sm:w-60 sm:h-60`}
                    />
                ) : (
                    <QRCode renderAs={'svg'} value={value} size={240} css={tw`block`} />
                )}
            </div>
        </div>
    );
}

type StatusKind = 'paid' | 'expired' | 'pending';

function StatusBadge({ kind, label }: { kind: StatusKind; label: string }) {
    const icon = kind === 'paid' ? 'check_circle' : kind === 'expired' ? 'cancel' : 'schedule';

    return (
        <span
            css={[
                tw`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-micro text-label-micro uppercase tracking-wide flex-shrink-0`,
                kind === 'paid' && tw`bg-success-bg text-success`,
                kind === 'expired' && tw`bg-danger-bg text-danger`,
                kind === 'pending' && tw`bg-warning-bg text-warning`,
            ]}
        >
            <MaterialIcon
                name={icon}
                size={14}
                css={kind === 'pending' ? tw`animate-pulse` : undefined}
            />
            {label}
        </span>
    );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div css={tw`flex items-start justify-between gap-4 py-3 border-b border-muted last:border-0`}>
            <dt css={tw`font-body-sm text-body-sm text-text-secondary flex-shrink-0`}>{label}</dt>
            <dd css={tw`font-body-sm text-body-sm text-text-primary text-right break-all min-w-0`}>{children}</dd>
        </div>
    );
}

export default () => {
    const { invoiceId } = useParams<{ invoiceId: string }>();
    const flashKey = `billing-invoice-${invoiceId}`;
    const { clearAndAddHttpError, clearFlashes } = useFlashKey(flashKey);
    const { addFlash } = useFlash();

    const [detail, setDetail] = useState<InvoiceDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [announcement, setAnnouncement] = useState('');
    const loadedRef = useRef(false);

    const id = Number.parseInt(invoiceId, 10);

    const refresh = async () => {
        if (!Number.isFinite(id)) return;

        try {
            const data = await getInvoiceDetail(id);
            setDetail(data);
        } catch (err: any) {
            clearAndAddHttpError(err);
        } finally {
            setLoading(false);
            loadedRef.current = true;
        }
    };

    // refresh() versi diam: dipakai auto-poll supaya kegagalan sesaat (jaringan
    // putus, 500 sesaat) tidak memunculkan flash error tiap 5 detik di layar
    // pembeli yang sedang menunggu pembayaran.
    const refreshQuietly = async () => {
        if (!Number.isFinite(id)) return;

        try {
            const data = await getInvoiceDetail(id);
            setDetail(data);
        } catch (err) {
            // sengaja diabaikan — countdown dan tombol manual tetap jadi jalur utama
        } finally {
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

    const expiresAtMs = detail?.expires_at ? new Date(detail.expires_at).getTime() : null;
    const totalSec = (detail?.lifetime_minutes ?? 3) * 60;
    const remainingSec =
        detail?.can_pay && expiresAtMs !== null ? Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000)) : null;
    const isCountdownExpired = remainingSec !== null && remainingSec <= 0;

    // Status pembayaran berubah dari sisi gateway, bukan dari aksi user di
    // halaman ini. Tanpa auto-poll, pembeli yang sudah scan dan bayar tetap
    // melihat "Menunggu Pembayaran" sampai dia menekan tombol manual — persis
    // saat dia paling tidak sabar.
    const shouldPoll = detail?.can_pay === true && detail.invoice.status === 'pending' && !isCountdownExpired;

    useEffect(() => {
        if (!shouldPoll) return;

        const t = window.setInterval(() => {
            // Tab yang ditinggal tidak perlu memanggil API; tick berikutnya
            // langsung menyusul begitu tab terlihat lagi.
            if (document.visibilityState !== 'visible') return;
            refreshQuietly();
        }, POLL_INTERVAL_MS);

        // Bersihkan saat unmount ATAU saat shouldPoll berubah jadi false
        // (invoice lunas/kedaluwarsa) — tanpa ini polling terus jalan selamanya.
        return () => window.clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldPoll, invoiceId]);

    // Deadline lewat -> fetch ulang sekali supaya status + pembersihan payload sinkron.
    useEffect(() => {
        if (!isCountdownExpired || !detail?.can_pay) return;
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCountdownExpired]);

    // Pengumuman screen reader hanya pada ambang batas, bukan tiap detik.
    useEffect(() => {
        if (remainingSec === null) {
            setAnnouncement('');
        } else if (remainingSec <= 0) {
            setAnnouncement('Waktu pembayaran habis.');
        } else if (remainingSec <= 60) {
            setAnnouncement('Kurang dari satu menit tersisa.');
        }
    }, [remainingSec === null, remainingSec !== null && remainingSec <= 0, remainingSec !== null && remainingSec <= 60]);

    const onCheckPayment = async () => {
        setChecking(true);
        clearFlashes();
        try {
            const data = await checkInvoice(id);
            addFlash({
                key: flashKey,
                // Pesan datang dari server: 'Pembayaran diterima…', 'Belum ada pembayaran…', dsb.
                type: data.invoice.status === 'paid' ? 'success' : 'error',
                message: data.message,
            });
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
                <div css={tw`rounded-xl bg-surface-card p-space-xl text-center shadow-md`}>
                    <MaterialIcon name={'receipt_long'} size={40} css={tw`text-text-muted mb-4`} />
                    <h2 css={tw`font-headline-sm text-headline-sm text-text-primary mb-1`}>
                        Invoice tidak ditemukan
                    </h2>
                    <p css={tw`font-body-sm text-body-sm text-text-secondary mb-6`}>
                        Invoice ini mungkin sudah dihapus atau bukan milik akun Anda.
                    </p>
                    <Link to={'/store'} css={tw`no-underline`}>
                        <Button>Kembali ke Store</Button>
                    </Link>
                </div>
            </PageContentBlock>
        );
    }

    const invoice = detail.invoice;
    const paid = invoice.status === 'paid';
    const expired = invoice.status === 'expired' || (isCountdownExpired ?? false);
    const canPay = detail.can_pay && !expired;
    const urgent = remainingSec !== null && remainingSec <= 60;
    const progress = remainingSec !== null && totalSec > 0 ? Math.min(1, Math.max(0, remainingSec / totalSec)) : 0;

    const statusKind: StatusKind = paid ? 'paid' : expired ? 'expired' : 'pending';
    const statusLabel = paid ? 'Dibayar' : expired ? 'Kedaluwarsa' : 'Menunggu Pembayaran';

    // Provisioning dianggap selesai hanya kalau server benar-benar terhubung ke
    // subscription. Invoice initial bisa PAID tanpa server bila provisioning gagal.
    const provisioned = detail.subscription?.server_id != null;
    const serverName = detail.subscription?.server?.name ?? detail.subscription?.server_name ?? null;

    /*
     * "Cetak" dan "Unduh PDF" sama-sama memanggil window.print().
     * Ekspor PDF sisi server belum ada; keduanya disediakan karena brief-4
     * menampilkan dua tombol, dan browser memang bisa "Save as PDF" dari dialog
     * cetak. `aria-label` dibedakan supaya screen reader tidak membacakan dua
     * tombol identik.
     */
    const onPrint = () => window.print();

    return (
        <PageContentBlock title={`Invoice ${invoice.order_id}`}>
            <FlashMessageRender byKey={flashKey} css={tw`mb-6`} />

            {/* Pengumuman aksesibilitas: diperbarui hanya saat ambang batas terlewati. */}
            <p aria-live={'polite'} css={tw`sr-only`}>
                {announcement}
            </p>

            <div css={tw`relative`}>
                <SpinnerOverlay visible={checking} />

                {/* ---- Breadcrumb ---- */}
                <nav aria-label={'Breadcrumb'} css={tw`flex items-center gap-2 mb-space-md font-label-micro text-label-micro uppercase tracking-wider`}>
                    <Link to={'/store'} css={tw`text-text-muted hover:text-text-primary no-underline transition-colors`}>
                        Store
                    </Link>
                    <span css={tw`text-text-muted`}>/</span>
                    <Link
                        to={'/account/billing'}
                        css={tw`text-text-muted hover:text-text-primary no-underline transition-colors`}
                    >
                        Billing
                    </Link>
                    <span css={tw`text-text-muted`}>/</span>
                    <span css={tw`text-brand font-bold`}>Checkout</span>
                </nav>

                {/* ---- Header halaman ---- */}
                <div css={tw`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-space-lg`}>
                    <div css={tw`flex flex-wrap items-center gap-3 min-w-0`}>
                        <h1 css={tw`font-headline-lg text-headline-lg text-text-primary tracking-tight truncate`}>
                            Invoice #{invoice.order_id}
                        </h1>
                        <span
                            css={tw`rounded-full bg-cyan-950/60 px-2.5 py-0.5 font-label-micro text-label-micro text-brand uppercase flex-shrink-0`}
                        >
                            QRIS Standard
                        </span>
                    </div>

                    <div css={tw`flex items-center gap-2 flex-shrink-0`}>
                        <button
                            type={'button'}
                            onClick={onPrint}
                            aria-label={'Cetak invoice'}
                            css={tw`flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-2 font-label-sm text-label-sm text-text-primary transition-colors hover:bg-surface-container-high`}
                        >
                            <MaterialIcon name={'print'} size={16} />
                            Cetak
                        </button>
                        <button
                            type={'button'}
                            onClick={onPrint}
                            aria-label={'Unduh invoice sebagai PDF melalui dialog cetak'}
                            css={tw`flex items-center gap-1.5 rounded-lg bg-surface-container px-3 py-2 font-label-sm text-label-sm text-text-primary transition-colors hover:bg-surface-container-high`}
                        >
                            <MaterialIcon name={'receipt_long'} size={16} />
                            Unduh PDF
                        </button>
                    </div>
                </div>

                <div css={tw`grid grid-cols-1 lg:grid-cols-5 gap-6 items-start`}>
                    {/* ---------------- Kolom kiri: pembayaran ---------------- */}
                    <section
                        aria-labelledby={'payment-heading'}
                        css={tw`lg:col-span-3 rounded-xl bg-surface-card shadow-md overflow-hidden`}
                    >
                        <header
                            css={tw`flex items-center justify-between gap-4 px-space-md py-space-sm bg-surface-header border-b border-muted`}
                        >
                            <div css={tw`flex items-center gap-2.5 min-w-0`}>
                                <div
                                    css={tw`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-container/20 text-brand`}
                                >
                                    <MaterialIcon name={'qr_code_2'} size={20} />
                                </div>
                                <div css={tw`min-w-0`}>
                                    <h2 id={'payment-heading'} css={tw`font-headline-sm text-headline-sm text-text-primary truncate`}>
                                        {paid
                                            ? 'Pembayaran Berhasil'
                                            : expired
                                            ? 'Invoice Kedaluwarsa'
                                            : 'Selesaikan Pembayaran'}
                                    </h2>
                                    <p css={tw`font-body-sm text-body-sm text-text-muted`}>
                                        Gateway Otomatis · Verifikasi Instan
                                    </p>
                                </div>
                            </div>
                            <StatusBadge kind={statusKind} label={statusLabel} />
                        </header>

                        <div css={tw`p-space-md`}>
                            {canPay && (
                                <>
                                    <div css={tw`bg-surface-container-lowest rounded-xl p-space-md mb-space-md`}>
                                        <div css={tw`flex flex-col sm:flex-row items-center sm:items-start gap-6`}>
                                            {/* Countdown ring */}
                                            <div css={tw`flex flex-col items-center gap-2 flex-shrink-0`}>
                                                <div css={tw`relative`}>
                                                    <svg
                                                        width={'72'}
                                                        height={'72'}
                                                        viewBox={'0 0 72 72'}
                                                        css={tw`block text-surface-container-high`}
                                                        aria-hidden={'true'}
                                                    >
                                                        <circle
                                                            cx={'36'}
                                                            cy={'36'}
                                                            r={RING_RADIUS}
                                                            fill={'none'}
                                                            stroke={'currentColor'}
                                                            strokeWidth={'5'}
                                                        />
                                                    </svg>
                                                    <svg
                                                        width={'72'}
                                                        height={'72'}
                                                        viewBox={'0 0 72 72'}
                                                        css={[
                                                            tw`absolute inset-0 block`,
                                                            urgent ? tw`text-danger` : tw`text-cyan-400`,
                                                        ]}
                                                        aria-hidden={'true'}
                                                    >
                                                        <circle
                                                            cx={'36'}
                                                            cy={'36'}
                                                            r={RING_RADIUS}
                                                            fill={'none'}
                                                            stroke={'currentColor'}
                                                            strokeWidth={'5'}
                                                            strokeLinecap={'round'}
                                                            strokeDasharray={RING_CIRCUMFERENCE}
                                                            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                                                            transform={'rotate(-90 36 36)'}
                                                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                                                        />
                                                    </svg>
                                                    <span
                                                        role={'timer'}
                                                        aria-live={'off'}
                                                        css={[
                                                            tw`absolute inset-0 flex items-center justify-center font-mono font-headline-sm text-headline-sm font-bold`,
                                                            urgent ? tw`text-danger` : tw`text-cyan-400`,
                                                        ]}
                                                    >
                                                        {formatClock(remainingSec ?? 0)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div css={tw`flex-1 min-w-0 text-center sm:text-left`}>
                                                <p
                                                    css={tw`font-label-micro text-label-micro uppercase tracking-wider text-text-muted mb-1`}
                                                >
                                                    Sisa Waktu Pembayaran
                                                </p>
                                                <p css={tw`font-body-md text-body-md text-text-secondary mb-1`}>
                                                    Scan QR di bawah dengan aplikasi pembayaran Anda.
                                                </p>
                                                <p css={tw`font-body-sm text-body-sm text-text-muted`}>
                                                    Bayar sebelum pukul {formatTime(detail.expires_at)}. Sisa waktu{' '}
                                                    {detail.lifetime_minutes ?? 3} menit.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <PaymentQR value={detail.qr_string} />

                                    <div css={tw`text-center mt-space-sm`}>
                                        <p css={tw`font-label-micro text-label-micro uppercase tracking-wider text-text-muted`}>
                                            QRIS / Standar Pembayaran Nasional
                                        </p>
                                        <p css={tw`font-label-md text-label-md text-text-primary mt-1`}>
                                            CHANZX CLOUDHOST
                                        </p>
                                        <p css={tw`font-mono font-title-md text-title-md text-cyan-400`}>
                                            {formatRupiah(invoice.total_payment_cents ?? invoice.amount_cents)}
                                        </p>
                                    </div>

                                    {/* Pemisah ikut syarat yang sama dengan tombolnya —
                                        QRIS tidak punya redirect_url, jadi tanpa ini
                                        "ATAU" menggantung tanpa apa pun di bawahnya. */}
                                    {detail.redirect_url && (
                                        <div css={tw`flex items-center gap-3 my-space-md`} aria-hidden={'true'}>
                                            <span css={tw`flex-1 h-px bg-border-muted`} />
                                            <span
                                                css={tw`font-label-micro text-label-micro uppercase tracking-wider text-text-muted`}
                                            >
                                                atau
                                            </span>
                                            <span css={tw`flex-1 h-px bg-border-muted`} />
                                        </div>
                                    )}

                                    <div css={tw`flex flex-col gap-3 mt-space-md`}>
                                        {detail.redirect_url && (
                                            <a
                                                href={detail.redirect_url}
                                                target={'_blank'}
                                                rel={'noreferrer noopener'}
                                                aria-label={'Buka halaman pembayaran di tab baru'}
                                                css={tw`inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-text-primary font-label-md text-label-md font-semibold no-underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
                                            >
                                                <MaterialIcon name={'open_in_new'} size={16} />
                                                Buka Halaman Pembayaran
                                            </a>
                                        )}
                                        <button
                                            type={'button'}
                                            onClick={onCheckPayment}
                                            disabled={checking}
                                            aria-label={'Periksa status pembayaran'}
                                            css={tw`inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-60 text-text-primary font-label-md text-label-md font-semibold transition-colors`}
                                        >
                                            <MaterialIcon name={'check_circle'} size={16} css={tw`text-success`} />
                                            {checking ? 'Memeriksa…' : 'Saya Sudah Bayar'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {paid && (
                                <div css={tw`flex flex-col items-center text-center py-4`}>
                                    <MaterialIcon name={'check_circle'} size={56} css={tw`text-success mb-4`} />
                                    <h2 css={tw`font-headline-sm text-headline-sm text-text-primary mb-2`} role={'status'}>
                                        Pembayaran terkonfirmasi
                                    </h2>
                                    {/* subscription.server_id null = provisioning belum jalan/gagal.
                                        Jangan janjikan "muncul otomatis" kalau server belum terbuat. */}
                                    {provisioned ? (
                                        <p css={tw`font-body-sm text-body-sm text-text-secondary max-w-md mb-6`}>
                                            Server <strong css={tw`text-text-primary`}>{serverName}</strong> sudah dibuat
                                            dan sedang disiapkan. Buka dashboard untuk melihatnya.
                                        </p>
                                    ) : (
                                        <p css={tw`font-body-sm text-body-sm text-text-secondary max-w-md mb-6`} role={'alert'}>
                                            Pembayaran sudah kami terima, tetapi server belum berhasil dibuat. Admin sudah
                                            dicatat untuk menindaklanjuti — hubungi admin bila lebih dari 15 menit belum
                                            ada server di dashboard.
                                        </p>
                                    )}
                                    <div css={tw`flex flex-col sm:flex-row gap-3 w-full sm:w-auto`}>
                                        <Link to={'/account/billing'} css={tw`no-underline`}>
                                            <Button className={'w-full sm:w-auto'}>Lihat Billing</Button>
                                        </Link>
                                        <Link to={'/'} css={tw`no-underline`}>
                                            <Button.Text className={'w-full sm:w-auto'}>Ke Dashboard</Button.Text>
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {expired && !paid && (
                                <div css={tw`flex flex-col items-center text-center py-4`}>
                                    <MaterialIcon name={'hourglass_disabled'} size={56} css={tw`text-danger mb-4`} />
                                    <h2 css={tw`font-headline-sm text-headline-sm text-text-primary mb-2`} role={'alert'}>
                                        Waktu pembayaran habis
                                    </h2>
                                    <p css={tw`font-body-sm text-body-sm text-text-secondary max-w-md mb-6`}>
                                        Invoice ini tidak bisa dibayar lagi. Buat invoice baru di Store untuk melanjutkan
                                        pembelian paket.
                                    </p>
                                    <Link to={'/store'} css={tw`no-underline`}>
                                        <Button>Buat Invoice Baru</Button>
                                    </Link>
                                </div>
                            )}

                            {!canPay && !paid && !expired && (
                                <p css={tw`font-body-sm text-body-sm text-text-secondary text-center py-4`} role={'status'}>
                                    Invoice tidak dapat dibayar lagi.
                                </p>
                            )}
                        </div>

                        {/* ---- Kartu keamanan ---- */}
                        <div
                            css={tw`flex items-center gap-3 px-space-md py-space-sm bg-surface-container-low border-t border-muted`}
                        >
                            <MaterialIcon name={'shield'} size={18} css={tw`text-success flex-shrink-0`} />
                            <p css={tw`font-body-sm text-body-sm text-text-secondary`}>
                                Transaksi diproses lewat gateway berlisensi dan memenuhi standar{' '}
                                <span css={tw`text-text-primary font-semibold`}>PCI-DSS</span>.
                            </p>
                        </div>
                    </section>

                    {/* ---------------- Kolom kanan: rincian ---------------- */}
                    <aside
                        aria-labelledby={'summary-heading'}
                        css={tw`lg:col-span-2 rounded-xl bg-surface-card shadow-md overflow-hidden`}
                    >
                        <header css={tw`px-space-md py-space-sm border-b border-muted`}>
                            <h2
                                id={'summary-heading'}
                                css={tw`font-label-micro text-label-micro uppercase tracking-wider text-text-muted`}
                            >
                                Rincian Invoice
                            </h2>
                        </header>

                        <div css={tw`p-space-md`}>
                            {/* Yang di-scan pembeli adalah total_payment (harga + biaya
                                layanan gateway), bukan amount_cents (pendapatan kita).
                                Menampilkan amount_cents di sini membuat angka di layar
                                beda dengan angka di aplikasi pembayaran mereka. */}
                            <div css={tw`bg-surface-container-lowest rounded-xl p-space-md mb-space-md`}>
                                <p css={tw`font-label-micro text-label-micro uppercase tracking-wider text-text-muted mb-1`}>
                                    Total Tagihan
                                </p>
                                <p css={tw`font-headline-lg text-headline-lg font-mono text-cyan-400`}>
                                    {formatRupiah(invoice.total_payment_cents ?? invoice.amount_cents)}
                                </p>
                            </div>

                            {(invoice.total_payment_cents ?? invoice.amount_cents) !== invoice.amount_cents && (
                                <dl css={tw`m-0 mb-space-md`}>
                                    <InfoRow label={'Harga paket'}>
                                        <span css={tw`font-mono`}>{formatRupiah(invoice.amount_cents)}</span>
                                    </InfoRow>
                                    <InfoRow label={'Biaya layanan'}>
                                        <span css={tw`font-mono`}>
                                            {formatRupiah((invoice.total_payment_cents ?? 0) - invoice.amount_cents)}
                                        </span>
                                    </InfoRow>
                                </dl>
                            )}

                            <dl css={tw`m-0`}>
                                <InfoRow label={'Order ID'}>
                                    <CopyOnClick text={invoice.order_id}>
                                        <span
                                            title={'Klik untuk menyalin Order ID'}
                                            css={tw`font-mono font-label-sm text-label-sm text-text-primary inline-flex items-center gap-2 hover:text-cyan-400 transition-colors`}
                                        >
                                            {invoice.order_id}
                                            <MaterialIcon name={'content_copy'} size={14} />
                                        </span>
                                    </CopyOnClick>
                                </InfoRow>
                                {detail.subscription?.plan && (
                                    <>
                                        <InfoRow label={'Paket'}>{detail.subscription.plan.name}</InfoRow>
                                        <InfoRow label={'Durasi'}>
                                            {detail.subscription.plan.duration_days} hari
                                        </InfoRow>
                                    </>
                                )}
                                <InfoRow label={'Server'}>
                                    {detail.subscription?.server?.name ??
                                        detail.subscription?.server_name ?? (
                                            <span css={tw`text-text-muted`}>Dibuat setelah pembayaran</span>
                                        )}
                                </InfoRow>
                                <InfoRow label={'Jenis'}>
                                    <span
                                        css={tw`rounded bg-surface-container-high px-2 py-0.5 font-label-micro text-label-micro uppercase text-text-tertiary`}
                                    >
                                        {invoice.type === 'renewal' ? 'Perpanjangan' : 'Pembelian Baru'}
                                    </span>
                                </InfoRow>
                                {invoice.paid_at && <InfoRow label={'Dibayar pada'}>{formatTime(invoice.paid_at)}</InfoRow>}
                                {!paid && (
                                    <InfoRow label={'Batas Bayar'}>
                                        <span css={tw`font-mono text-warning`}>{formatTime(detail.expires_at)}</span>
                                    </InfoRow>
                                )}
                            </dl>

                            <div css={tw`mt-space-md pt-space-sm border-t border-muted flex flex-col gap-2`}>
                                <Link
                                    to={'/store'}
                                    css={tw`inline-flex items-center gap-1.5 font-body-sm text-body-sm text-text-secondary hover:text-cyan-400 no-underline transition-colors`}
                                >
                                    <MaterialIcon name={'arrow_back'} size={16} />
                                    Kembali ke Store
                                </Link>
                                <Link
                                    to={'/account/billing'}
                                    css={tw`inline-flex items-center gap-1.5 font-body-sm text-body-sm text-text-secondary hover:text-cyan-400 no-underline transition-colors`}
                                >
                                    <MaterialIcon name={'history'} size={16} />
                                    Lihat riwayat Billing
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* ---- Footer dua baris ---- */}
                <footer
                    css={tw`mt-space-xl pt-space-md border-t border-muted flex flex-col items-center gap-1 text-text-muted font-body-sm text-body-sm`}
                >
                    <p>Pterodactyl® © 2015 - 2026</p>
                    <p css={tw`font-mono text-[11px]`}>Chanzx CloudHost · ServerPanel</p>
                </footer>
            </div>
        </PageContentBlock>
    );
};
