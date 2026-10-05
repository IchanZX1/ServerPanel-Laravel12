import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCheckCircle,
    faClock,
    faCopy,
    faExternalLinkAlt,
    faHourglassHalf,
    faQrcode,
    faReceipt,
    faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';
import PageContentBlock from '@/components/elements/PageContentBlock';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import FlashMessageRender from '@/components/FlashMessageRender';
import CopyOnClick from '@/components/elements/CopyOnClick';
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
 * tampilkan info bahwa QR tidak tersedia dan arahkan ke halaman gateway.
 */
function PaymentQR({ value }: { value: string | null }) {
    if (!value) {
        return (
            <div
                role={'status'}
                css={tw`flex flex-col items-center justify-center gap-3 w-52 h-52 sm:w-60 sm:h-60 mx-auto rounded-lg border border-dashed border-neutral-700 bg-neutral-900`}
            >
                <FontAwesomeIcon icon={faQrcode} aria-hidden={'true'} css={tw`w-8 h-8 text-neutral-600`} />
                <p css={tw`text-xs text-neutral-400 text-center px-4`}>
                    QR tidak tersedia. Gunakan tombol halaman pembayaran.
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
            <div css={tw`p-4 bg-white rounded-lg shadow-ds-1`}>
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
    const icon = kind === 'paid' ? faCheckCircle : kind === 'expired' ? faTimesCircle : faClock;

    return (
        <span
            css={[
                tw`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-opacity-30 text-xs font-medium uppercase tracking-wide flex-shrink-0`,
                kind === 'paid' && tw`bg-green-500 bg-opacity-10 text-green-400 border-green-500`,
                kind === 'expired' && tw`bg-red-500 bg-opacity-10 text-red-400 border-red-500`,
                kind === 'pending' && tw`bg-yellow-500 bg-opacity-10 text-yellow-400 border-yellow-500`,
            ]}
        >
            <FontAwesomeIcon icon={icon} aria-hidden={'true'} css={tw`w-3 h-3`} />
            {label}
        </span>
    );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div css={tw`flex items-start justify-between gap-4 py-3 border-b border-neutral-800 last:border-0`}>
            <dt css={tw`text-sm text-neutral-400 flex-shrink-0`}>{label}</dt>
            <dd css={tw`text-sm text-right break-all min-w-0`}>{children}</dd>
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
                <div css={tw`rounded-lg border border-neutral-800 bg-neutral-900 p-8 text-center`}>
                    <FontAwesomeIcon icon={faReceipt} aria-hidden={'true'} css={tw`w-10 h-10 text-neutral-600 mb-4`} />
                    <h2 css={tw`text-lg font-semibold text-neutral-200 mb-1`}>Invoice tidak ditemukan</h2>
                    <p css={tw`text-sm text-neutral-400 mb-6`}>
                        Invoice ini mungkin sudah dihapus atau bukan milik akun Anda.
                    </p>
                    <Link to={'/store'}>
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

    return (
        <PageContentBlock title={`Invoice ${invoice.order_id}`}>
            <FlashMessageRender byKey={flashKey} css={tw`mb-6`} />

            {/* Pengumuman aksesibilitas: diperbarui hanya saat ambang batas terlewati. */}
            <p aria-live={'polite'} css={tw`sr-only`}>
                {announcement}
            </p>

            <div css={tw`relative`}>
                <SpinnerOverlay visible={checking} />

                <div css={tw`grid grid-cols-1 lg:grid-cols-5 gap-6 items-start`}>
                    {/* ---------------- Kolom kiri: pembayaran ---------------- */}
                    <section
                        aria-labelledby={'payment-heading'}
                        css={tw`lg:col-span-3 rounded-lg border border-neutral-800 bg-neutral-900 bg-opacity-90 shadow-ds-1 overflow-hidden`}
                    >
                        <header css={tw`flex items-center justify-between gap-4 px-5 py-4 border-b border-neutral-800`}>
                            <div css={tw`flex items-center gap-2 min-w-0`}>
                                <FontAwesomeIcon icon={faQrcode} aria-hidden={'true'} css={tw`w-4 h-4 text-cyan-400`} />
                                <h1 id={'payment-heading'} css={tw`text-base font-semibold text-neutral-100 truncate`}>
                                    {paid ? 'Pembayaran Berhasil' : expired ? 'Invoice Kedaluwarsa' : 'Selesaikan Pembayaran'}
                                </h1>
                            </div>
                            <StatusBadge kind={statusKind} label={statusLabel} />
                        </header>

                        <div css={tw`p-5 sm:p-6`}>
                            {canPay && (
                                <>
                                    <div css={tw`flex flex-col sm:flex-row items-center sm:items-start gap-6`}>
                                        {/* Countdown ring */}
                                        <div css={tw`flex flex-col items-center gap-2 flex-shrink-0`}>
                                            <div css={tw`relative`}>
                                                <svg
                                                    width={'72'}
                                                    height={'72'}
                                                    viewBox={'0 0 72 72'}
                                                    css={[tw`block`, urgent ? tw`text-red-400` : tw`text-cyan-400`]}
                                                    aria-hidden={'true'}
                                                >
                                                    <circle
                                                        cx={'36'}
                                                        cy={'36'}
                                                        r={RING_RADIUS}
                                                        fill={'none'}
                                                        stroke={'currentColor'}
                                                        strokeOpacity={'0.15'}
                                                        strokeWidth={'5'}
                                                    />
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
                                                        tw`absolute inset-0 flex items-center justify-center font-mono text-sm font-bold`,
                                                        urgent ? tw`text-red-400` : tw`text-cyan-400`,
                                                    ]}
                                                >
                                                    {formatClock(remainingSec ?? 0)}
                                                </span>
                                            </div>
                                            <p css={tw`text-2xs uppercase tracking-wide text-neutral-500`}>Sisa waktu</p>
                                        </div>

                                        <div css={tw`flex-1 min-w-0 text-center sm:text-left`}>
                                            <p css={tw`text-sm text-neutral-300 mb-1`}>
                                                Scan QR di bawah dengan aplikasi pembayaran Anda.
                                            </p>
                                            <p css={tw`text-xs text-neutral-500`}>
                                                Bayar sebelum pukul {formatTime(detail.expires_at)}. Invoice berlaku{' '}
                                                {detail.lifetime_minutes ?? 3} menit sejak dibuat.
                                            </p>
                                        </div>
                                    </div>

                                    <div css={tw`mt-6`}>
                                        <PaymentQR value={detail.qr_string} />
                                    </div>

                                    <div css={tw`flex items-center gap-3 my-6`} aria-hidden={'true'}>
                                        <span css={tw`flex-1 h-px bg-neutral-800`} />
                                        <span css={tw`text-2xs uppercase tracking-wide text-neutral-500`}>atau</span>
                                        <span css={tw`flex-1 h-px bg-neutral-800`} />
                                    </div>

                                    <div css={tw`flex flex-col gap-3`}>
                                        {detail.redirect_url && (
                                            <a
                                                href={detail.redirect_url}
                                                target={'_blank'}
                                                rel={'noreferrer noopener'}
                                                aria-label={'Buka halaman pembayaran di tab baru'}
                                                css={tw`inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white text-sm font-medium no-underline transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900`}
                                            >
                                                <FontAwesomeIcon icon={faExternalLinkAlt} aria-hidden={'true'} css={tw`w-3.5 h-3.5`} />
                                                Buka Halaman Pembayaran
                                            </a>
                                        )}
                                        <Button
                                            onClick={onCheckPayment}
                                            disabled={checking}
                                            className={'w-full'}
                                            aria-label={'Periksa status pembayaran'}
                                        >
                                            {checking ? 'Memeriksa…' : 'Saya Sudah Bayar'}
                                        </Button>
                                    </div>
                                </>
                            )}

                            {paid && (
                                <div css={tw`flex flex-col items-center text-center py-4`}>
                                    <FontAwesomeIcon
                                        icon={faCheckCircle}
                                        aria-hidden={'true'}
                                        css={tw`w-14 h-14 text-green-400 mb-4`}
                                    />
                                    <h2 css={tw`text-lg font-semibold text-neutral-100 mb-2`} role={'status'}>
                                        Pembayaran terkonfirmasi
                                    </h2>
                                    {/* subscription.server_id null = provisioning belum jalan/gagal.
                                        Jangan janjikan "muncul otomatis" kalau server belum terbuat. */}
                                    {provisioned ? (
                                        <p css={tw`text-sm text-neutral-400 max-w-md mb-6`}>
                                            Server <strong css={tw`text-neutral-200`}>{serverName}</strong> sudah dibuat
                                            dan sedang disiapkan. Buka dashboard untuk melihatnya.
                                        </p>
                                    ) : (
                                        <p css={tw`text-sm text-neutral-400 max-w-md mb-6`} role={'alert'}>
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
                                    <FontAwesomeIcon
                                        icon={faHourglassHalf}
                                        aria-hidden={'true'}
                                        css={tw`w-14 h-14 text-red-400 mb-4`}
                                    />
                                    <h2 css={tw`text-lg font-semibold text-neutral-100 mb-2`} role={'alert'}>
                                        Waktu pembayaran habis
                                    </h2>
                                    <p css={tw`text-sm text-neutral-400 max-w-md mb-6`}>
                                        Invoice ini tidak bisa dibayar lagi. Buat invoice baru di Store untuk melanjutkan
                                        pembelian paket.
                                    </p>
                                    <Link to={'/store'} css={tw`no-underline`}>
                                        <Button>Buat Invoice Baru</Button>
                                    </Link>
                                </div>
                            )}

                            {!canPay && !paid && !expired && (
                                <p css={tw`text-sm text-neutral-400 text-center py-4`} role={'status'}>
                                    Invoice tidak dapat dibayar lagi.
                                </p>
                            )}
                        </div>
                    </section>

                    {/* ---------------- Kolom kanan: rincian ---------------- */}
                    <aside
                        aria-labelledby={'summary-heading'}
                        css={tw`lg:col-span-2 rounded-lg border border-neutral-800 bg-neutral-900 bg-opacity-90 shadow-ds-1 overflow-hidden`}
                    >
                        <header css={tw`px-5 py-4 border-b border-neutral-800`}>
                            <h2 id={'summary-heading'} css={tw`text-xs font-semibold uppercase tracking-wider text-neutral-400`}>
                                Rincian Invoice
                            </h2>
                        </header>

                        <div css={tw`px-5 py-5`}>
                            <p css={tw`text-2xs uppercase tracking-wide text-neutral-500 mb-1`}>Total Tagihan</p>
                            <p css={tw`text-3xl font-bold font-mono text-cyan-400 mb-6`}>
                                {formatRupiah(invoice.amount_cents)}
                            </p>

                            <dl css={tw`m-0`}>
                                <InfoRow label={'Order ID'}>
                                    <CopyOnClick text={invoice.order_id}>
                                        <span
                                            title={'Klik untuk menyalin Order ID'}
                                            css={tw`font-mono text-xs text-neutral-200 inline-flex items-center gap-2 hover:text-cyan-400 transition-colors duration-150`}
                                        >
                                            {invoice.order_id}
                                            <FontAwesomeIcon icon={faCopy} aria-hidden={'true'} css={tw`w-3 h-3`} />
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
                                            <span css={tw`text-neutral-500`}>Dibuat setelah pembayaran</span>
                                        )}
                                </InfoRow>
                                <InfoRow label={'Jenis'}>
                                    {invoice.type === 'renewal' ? 'Perpanjangan' : 'Pembelian Baru'}
                                </InfoRow>
                                {invoice.paid_at && <InfoRow label={'Dibayar pada'}>{formatTime(invoice.paid_at)}</InfoRow>}
                                {!paid && <InfoRow label={'Batas Bayar'}>{formatTime(detail.expires_at)}</InfoRow>}
                            </dl>

                            <div css={tw`mt-6 pt-4 border-t border-neutral-800 flex flex-col gap-2`}>
                                <Link
                                    to={'/store'}
                                    css={tw`text-sm text-neutral-400 hover:text-cyan-400 no-underline transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-xs`}
                                >
                                    ← Kembali ke Store
                                </Link>
                                <Link
                                    to={'/account/billing'}
                                    css={tw`text-sm text-neutral-400 hover:text-cyan-400 no-underline transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-xs`}
                                >
                                    Lihat riwayat Billing
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </PageContentBlock>
    );
};
