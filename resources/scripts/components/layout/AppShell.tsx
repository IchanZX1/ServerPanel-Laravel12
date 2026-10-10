import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStoreState } from 'easy-peasy';
import classNames from 'classnames';
import { ApplicationStore, store } from '@/state';
import SearchContainer from '@/components/dashboard/search/SearchContainer';
import MaterialIcon from '@/components/elements/MaterialIcon';
import tw from 'twin.macro';
import styled from 'styled-components/macro';
import http from '@/api/http';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import useEventListener from '@/plugins/useEventListener';
import { breakpoint } from '@/theme';
import i18n from '@/i18n';
import updateAccountLanguage from '@/api/account/updateAccountLanguage';
import {
    applyTheme,
    getStoredLanguage,
    getStoredTheme,
    setStoredLanguage,
    ThemeName,
} from '@/appearance';

interface Props {
    /** Tab kontekstual (mis. daftar halaman /account atau /server/:id) yang tampil di dalam sidebar. */
    subNavigation?: React.ReactNode;
    /**
     * Nama node cluster yang menaungi server aktif. Hanya terisi dari ServerRouter
     * (di sana ServerContext tersedia); DashboardRouter tidak mengirimnya, sehingga
     * header jatuh ke nama panel.
     */
    node?: string | null;
}

/*
 * brief-5 — baris navigasi sidebar.
 *
 * Semua baris (link rute, tombol nonaktif, dan SearchContainer) memakai bentuk
 * yang sama persis: ikon 20px + label `label-md`, radius `lg`, jarak `gap-3`.
 * SearchContainer tidak diubah; ia merender `.navigation-link`, dan selektor
 * descendant di bawah ini yang menyeragamkannya dengan baris lain.
 */
const NavRow = styled.div`
    & > a,
    & > button,
    & > .navigation-link {
        ${tw`flex items-center w-full gap-3 px-3 py-2 rounded-lg text-left no-underline bg-transparent border-0 cursor-pointer transition-colors duration-150 font-label-md text-label-md text-on-surface-variant`};

        & > .material-symbols-outlined {
            ${tw`text-[20px] leading-none flex-shrink-0`};
        }

        &:hover {
            ${tw`bg-surface-hover text-on-surface`};
        }

        &:focus-visible {
            ${tw`outline-none ring-2 ring-brand ring-offset-2 ring-offset-surface-card`};
        }
    }

    /* Baris aktif brief-5: kotak terangkat + ikon berwarna brand + label tebal. */
    & > a.active,
    & > button.active {
        ${tw`bg-surface-active text-text-primary border border-strong shadow-sm font-semibold`};

        & > .material-symbols-outlined {
            ${tw`text-brand`};
        }
    }

    /* Entri tanpa halaman (lihat daftar disabled di bawah): tetap terlihat, mati. */
    & > button[aria-disabled='true'] {
        ${tw`opacity-40 cursor-not-allowed`};

        &:hover {
            ${tw`bg-transparent text-on-surface-variant`};
        }
    }
`;

/*
 * Kode bahasa: dua huruf kecil, sama dengan format kolom `language` di tabel users
 * (lihat App\Models\User::getAvailableLanguages()).
 *
 * `label` sengaja dipisah dari `code`: dua huruf pertama itu kode ISO-639-1
 * untuk mesin, dua huruf terakhir yang tampil di tombol. Bentuknya mengikuti
 * mockup brief-5 ("ID ID" / "GB EN").
 */
const LANGUAGES: { code: string; label: string }[] = [
    { code: 'id', label: 'ID ID' },
    { code: 'en', label: 'GB EN' },
];

/* Judul kolom mana pun untuk pembaca layar; mockup cuma menampilkan dua huruf. */
const LANGUAGE_NAMES: Record<string, string> = { id: 'Indonesia', en: 'English' };

/**
 * Top header cluster (PRD: "header cluster node (SG-01)").
 *
 * Terpisah dari sidebar supaya node aktif tetap terlihat saat sidebar
 * tersembunyi di bawah breakpoint xl. Label node diambil dari
 * ServerContext lewat prop `node` — tidak ada string cluster yang
 * di-hardcode, karena nama node berasal dari tabel `nodes` di DB.
 */
const TopHeader = styled.header`
    ${tw`sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-surface-header border-b border-muted`};
`;

const ClusterBadge = styled.span`
    ${tw`inline-flex items-center gap-2 px-2.5 py-1 rounded-xs bg-surface-container-high border border-muted text-2xs font-mono text-text-secondary`};
`;

// Catatan: JANGAN pakai utility translate Twin (`-translate-x-full`) di sini.
// Tailwind v2 memisahkan `--tw-translate-x` dari `--tw-transform`, dan `tw`-macro
// tidak memancarkan definisi `--tw-transform`, sehingga transform-nya jadi tidak
// valid dan sidebar tidak pernah benar-benar bergeser. Tulis transform eksplisit.
const Sidebar = styled.nav<{ $open: boolean }>`
    ${tw`fixed top-0 left-0 z-40 flex flex-col h-screen w-64 bg-surface-card border-r border-muted overflow-hidden`};
    transform: translateX(-100%);
    transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    will-change: transform;

    ${breakpoint('xl')`
        transform: translateX(0);
    `};

    ${(props) => props.$open && 'transform: translateX(0);'};
`;

/**
 * Header grup nav (MENU / ACCOUNT & WALLET / LAINNYA) — brief-5 merendernya
 * sebagai tombol lipat dengan ikon `expand_less`.
 */
const GroupHeader = styled.button`
    ${tw`flex items-center justify-between w-full px-2 py-1 bg-transparent border-0 cursor-pointer text-text-muted`};

    &:focus-visible {
        ${tw`outline-none ring-2 ring-brand rounded-sm`};
    }
`;

const GroupLabel = styled.span`
    ${tw`font-label-micro text-label-micro font-bold tracking-wider uppercase`};
`;

const GroupNav = styled(NavRow)`
    ${tw`space-y-0.5`};
`;

/** Baris tunggal yang tidak menuju halaman apa pun di panel ini. */
const DisabledRow = ({ icon, label }: { icon: string; label: string }) => (
    <button type={'button'} aria-disabled={'true'} title={`${label} belum tersedia di panel ini`}>
        <MaterialIcon name={icon} size={20} />
        <span>{label}</span>
    </button>
);

const AppShell: React.FC<Props> = ({ subNavigation, node, children }) => {
    const name = useStoreState((state: ApplicationStore) => state.settings.data!.name);
    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data!.rootAdmin);
    const username = useStoreState((state: ApplicationStore) => state.user.data!.username);
    const accountLanguage = useStoreState((state: ApplicationStore) => state.user.data!.language);

    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    /*
     * Tema terang/gelap brief-5.
     *
     * Nilai awalnya dibaca dari localStorage SAAT RENDER PERTAMA (bukan di efek),
     * supaya kelas `light` sudah terpasang sebelum paint pertama dan layar tidak
     * berkedip gelap lalu berubah terang.
     */
    const [theme, setTheme] = useState<ThemeName>(getStoredTheme);
    const [language, setLanguage] = useState(() => getStoredLanguage() || accountLanguage || 'en');
    const [savingLanguage, setSavingLanguage] = useState(false);

    // Tiap grup bisa dilipat sendiri-sendiri; semuanya terbuka seperti mockup.
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const toggleGroup = (key: string) => setCollapsed((value) => ({ ...value, [key]: !value[key] }));

    const toggleRef = useRef<HTMLButtonElement>(null);
    const sidebarRef = useRef<HTMLElement>(null);
    const wasOpen = useRef(false);

    const onTriggerLogout = () => {
        setIsLoggingOut(true);
        http.post('/auth/logout').finally(() => {
            // @ts-expect-error this is valid
            window.location = '/';
        });
    };

    /*
     * Kelas `light`/`dark` dipasang di <html> lewat applyTheme(). Pasangan
     * warnanya ada di GlobalStylesheet (blok `html.light`), bukan di sini —
     * supaya seluruh panel ikut berubah, bukan cuma sidebar.
     */
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    /*
     * Ganti bahasa.
     *
     * Tiga hal terjadi sekaligus supaya pilihan benar-benar "menempel":
     *
     *  1. `i18n.changeLanguage()` mengganti antarmuka saat itu juga.
     *  2. localStorage menyimpan pilihan agar bertahan setelah muat ulang
     *     (dibaca lagi oleh i18n.ts dan App.tsx).
     *  3. PUT /api/client/account/language menyimpan ke kolom `language` tabel
     *     users, sehingga pilihan ikut terbawa ke perangkat lain.
     *
     * Langkah 3 tidak memblokir antarmuka: bahasa sudah berganti sebelum
     * permintaan jaringan selesai. Kalau gagal (mis. sesi kedaluwarsa), pilihan
     * lokal tetap berlaku dan store dilepas balik ke nilai server supaya
     * tampilan tidak berbohong soal apa yang tersimpan.
     */
    const changeLanguage = (code: string) => {
        if (code === language) {
            return;
        }

        setLanguage(code);
        setStoredLanguage(code);
        i18n.changeLanguage(code);
        store.getActions().user.updateUserData({ language: code });

        setSavingLanguage(true);
        updateAccountLanguage(code)
            .catch(() => {
                setLanguage(accountLanguage || 'en');
                setStoredLanguage(accountLanguage || 'en');
                i18n.changeLanguage(accountLanguage || 'en');
                store.getActions().user.updateUserData({ language: accountLanguage });
            })
            .finally(() => setSavingLanguage(false));
    };

    // Navigasi dari dalam drawer harus menutup drawer-nya, kalau tidak overlay
    // akan tertinggal menutupi halaman tujuan.
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
    });

    // Pindahkan fokus ke item pertama saat drawer dibuka, dan kembalikan ke tombol
    // hamburger saat ditutup. Tanpa ini pengguna keyboard "tersesat" di belakang overlay.
    useEffect(() => {
        if (open) {
            sidebarRef.current?.querySelector<HTMLElement>('a, button')?.focus();
        } else if (wasOpen.current) {
            toggleRef.current?.focus();
        }

        wasOpen.current = open;
    }, [open]);

    const initial = (username || name || '?').trim().charAt(0).toUpperCase();

    return (
        <>
            <SpinnerOverlay visible={isLoggingOut} fixed />

            <button
                ref={toggleRef}
                type={'button'}
                aria-label={open ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
                aria-expanded={open}
                aria-controls={'app-sidebar'}
                onClick={() => setOpen((value) => !value)}
                css={tw`xl:hidden fixed top-3 left-3 z-50 flex items-center justify-center w-10 h-10 rounded-md bg-surface-card border border-muted text-text-secondary shadow-ds-1 transition-colors duration-150 hover:text-text-primary hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
            >
                <MaterialIcon name={open ? 'close' : 'menu'} size={20} />
            </button>
            {open && (
                <div
                    aria-hidden={'true'}
                    onClick={() => setOpen(false)}
                    css={tw`xl:hidden fixed inset-0 z-30 bg-black bg-opacity-60`}
                />
            )}

            <Sidebar ref={sidebarRef} id={'app-sidebar'} $open={open} aria-label={'Navigasi utama'}>
                {/* ---- Kartu pengguna (brief-5) ---- */}
                <div css={tw`p-3 border-b border-muted flex-shrink-0`}>
                    <div
                        css={tw`flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest border border-strong`}
                    >
                        <div css={tw`flex items-center gap-2.5 min-w-0`}>
                            <div
                                aria-hidden={'true'}
                                css={tw`w-9 h-9 rounded-full bg-green-600 flex items-center justify-center font-bold text-text-primary text-[15px] flex-shrink-0`}
                            >
                                {initial}
                            </div>
                            <div css={tw`flex flex-col min-w-0`}>
                                <span
                                    css={tw`font-label-md text-label-md font-semibold text-text-primary truncate leading-tight`}
                                >
                                    {username}
                                </span>
                                <span css={tw`font-label-micro text-label-micro text-text-muted leading-tight`}>
                                    {rootAdmin ? 'Administrator' : 'Member'}
                                </span>
                            </div>
                        </div>
                        <button
                            type={'button'}
                            onClick={onTriggerLogout}
                            title={'Sign Out'}
                            aria-label={'Sign Out'}
                            css={tw`p-1.5 rounded-lg text-text-muted transition-colors flex-shrink-0 hover:text-danger hover:bg-danger-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
                        >
                            <MaterialIcon name={'logout'} size={18} />
                        </button>
                    </div>
                </div>

                <div css={tw`flex-1 overflow-y-auto px-3 py-3 space-y-4`}>
                    {/*
                     * Pill saldo. Belum ada sumber datanya di panel (tidak ada tabel
                     * saldo/ledger), jadi angkanya tetap "Rp 0" dan barisnya sengaja
                     * tidak bisa diklik — bukan tombol yang diam-diam tidak melakukan apa-apa.
                     */}
                    <div
                        aria-disabled={'true'}
                        title={'Saldo belum tersedia di panel ini'}
                        css={tw`flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-strong`}
                    >
                        <div css={tw`flex items-center gap-2.5`}>
                            <MaterialIcon name={'account_balance_wallet'} size={20} />
                            <span css={tw`font-label-md text-label-md font-semibold text-text-primary`}>Rp 0</span>
                        </div>
                        <MaterialIcon name={'chevron_right'} size={18} />
                    </div>

                    {/* ---- MENU ---- */}
                    <div css={tw`space-y-1`}>
                        <GroupHeader
                            type={'button'}
                            onClick={() => toggleGroup('menu')}
                            aria-expanded={!collapsed.menu}
                            aria-controls={'sidebar-menu'}
                        >
                            <GroupLabel>Menu</GroupLabel>
                            <MaterialIcon name={collapsed.menu ? 'expand_more' : 'expand_less'} size={16} />
                        </GroupHeader>
                        {!collapsed.menu && (
                            <GroupNav id={'sidebar-menu'}>
                                <NavLink to={'/'} exact>
                                    <MaterialIcon name={'grid_view'} size={20} />
                                    <span>Dashboard</span>
                                </NavLink>
                                {/* Console butuh konteks server — dibuka lewat kartu server. */}
                                <DisabledRow icon={'terminal'} label={'Console'} />
                                <NavLink to={'/store'} exact>
                                    <MaterialIcon name={'shopping_cart'} size={20} />
                                    <span>New Services</span>
                                </NavLink>
                                {/* SearchContainer tetap di sini; gayanya ikut NavRow. */}
                                <SearchContainer label={'Cari Server'} />
                                {rootAdmin && (
                                    <a href={'/admin'} rel={'noreferrer'}>
                                        <MaterialIcon name={'admin_panel_settings'} size={20} />
                                        <span>Admin Panel</span>
                                    </a>
                                )}
                                <DisabledRow icon={'headset_mic'} label={'Layanan Support'} />
                                <DisabledRow icon={'menu_book'} label={'Panduan'} />
                            </GroupNav>
                        )}
                    </div>

                    {/* ---- ACCOUNT & WALLET ---- */}
                    <div css={tw`space-y-1`}>
                        <GroupHeader
                            type={'button'}
                            onClick={() => toggleGroup('account')}
                            aria-expanded={!collapsed.account}
                            aria-controls={'sidebar-account'}
                        >
                            <GroupLabel>Account &amp; Wallet</GroupLabel>
                            <MaterialIcon name={collapsed.account ? 'expand_more' : 'expand_less'} size={16} />
                        </GroupHeader>
                        {!collapsed.account && (
                            <GroupNav id={'sidebar-account'}>
                                <NavLink to={'/account'} exact>
                                    <MaterialIcon name={'account_circle'} size={20} />
                                    <span>Profile</span>
                                </NavLink>
                                <NavLink to={'/account/billing'} exact>
                                    <MaterialIcon name={'receipt_long'} size={20} />
                                    <span>Invoice</span>
                                </NavLink>
                                <DisabledRow icon={'account_balance_wallet'} label={'Saldo'} />
                            </GroupNav>
                        )}
                    </div>

                    {/* ---- LAINNYA (semuanya belum punya halaman di panel ini) ---- */}
                    <div css={tw`space-y-1`}>
                        <GroupHeader
                            type={'button'}
                            onClick={() => toggleGroup('other')}
                            aria-expanded={!collapsed.other}
                            aria-controls={'sidebar-other'}
                        >
                            <GroupLabel>Lainnya</GroupLabel>
                            <MaterialIcon name={collapsed.other ? 'expand_more' : 'expand_less'} size={16} />
                        </GroupHeader>
                        {!collapsed.other && (
                            <GroupNav id={'sidebar-other'}>
                                <DisabledRow icon={'home'} label={'Beranda'} />
                                <DisabledRow icon={'auto_awesome'} label={'Fitur'} />
                                <DisabledRow icon={'sell'} label={'Paket Harga'} />
                                <DisabledRow icon={'help'} label={'FAQ'} />
                            </GroupNav>
                        )}
                    </div>

                    {subNavigation}
                </div>

                {/* ---- Footer: bahasa, tema, bantuan ---- */}
                <div css={tw`p-3 border-t border-muted flex-shrink-0`}>
                    <div
                        css={tw`p-3 rounded-xl bg-surface-container-lowest border border-strong space-y-3`}
                    >
                        <div css={tw`flex items-center justify-between`}>
                            <span css={tw`font-label-sm text-label-sm text-text-muted`}>Bahasa</span>
                            <div
                                role={'group'}
                                aria-label={'Pilih bahasa'}
                                aria-busy={savingLanguage}
                                css={tw`flex items-center gap-1 p-0.5 rounded-lg bg-surface-container-high border border-strong`}
                            >
                                {LANGUAGES.map((item) => {
                                    const active = language === item.code;

                                    return (
                                        <button
                                            key={item.code}
                                            type={'button'}
                                            onClick={() => changeLanguage(item.code)}
                                            aria-pressed={active}
                                            title={LANGUAGE_NAMES[item.code]}
                                            className={classNames(
                                                'px-2.5 py-1 rounded-md text-[11px] leading-none tracking-wide transition-colors',
                                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                                                active
                                                    ? 'bg-brand text-on-primary font-bold shadow-sm'
                                                    : 'font-medium text-text-muted hover:text-text-primary hover:bg-surface-hover'
                                            )}
                                        >
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div css={tw`flex items-center justify-between`}>
                            <span css={tw`font-label-sm text-label-sm text-text-muted`}>Tampilan</span>
                            <div css={tw`flex items-center gap-2`}>
                                <span
                                    css={
                                        theme === 'light'
                                            ? tw`font-label-sm text-label-sm text-text-primary font-semibold`
                                            : tw`font-label-sm text-label-sm text-text-secondary font-medium`
                                    }
                                >
                                    {theme === 'light' ? 'Light' : 'Dark'}
                                </span>
                                <label css={tw`relative inline-flex items-center cursor-pointer`}>
                                    <input
                                        type={'checkbox'}
                                        className={'peer sr-only'}
                                        checked={theme === 'light'}
                                        onChange={(e) => setTheme(e.target.checked ? 'light' : 'dark')}
                                        aria-label={'Aktifkan mode terang'}
                                    />
                                    {/*
                                     * Gagangnya memakai after: (bukan <span> terpisah) supaya
                                     * tidak ikut terbaca pembaca layar dan agar posisinya
                                     * benar-benar digerakkan peer-checked dari checkbox.
                                     */}
                                    <div
                                        aria-hidden={'true'}
                                        css={tw`relative h-6 w-11 rounded-full border border-strong bg-surface-container-highest transition-colors peer-checked:bg-cyan-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-card after:absolute after:top-[3px] after:left-[3px] after:h-4 after:w-4 after:rounded-full after:bg-text-primary after:shadow-sm after:transition-transform peer-checked:after:translate-x-5`}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Belum ada nomor/link WhatsApp yang diberikan, jadi barisnya mati. */}
                        <button
                            type={'button'}
                            aria-disabled={'true'}
                            title={'Nomor WhatsApp CS belum diatur'}
                            css={tw`w-full pt-2 border-t border-strong flex items-center justify-between text-left bg-transparent border-0 cursor-not-allowed opacity-40`}
                        >
                            <div css={tw`flex flex-col`}>
                                <span css={tw`font-label-sm text-label-sm font-semibold text-text-primary`}>
                                    Butuh Bantuan?
                                </span>
                                <span css={tw`font-label-micro text-label-micro text-text-muted`}>
                                    Hubungi CS via WhatsApp
                                </span>
                            </div>
                            <MaterialIcon name={'chevron_right'} size={18} />
                        </button>
                    </div>
                </div>
            </Sidebar>

            {/* pt-14 di mobile memberi ruang untuk tombol hamburger yang fixed. */}
            <div css={tw`min-h-screen flex flex-col xl:pl-64`}>
                {/*
                 * pl-16 di mobile menghindari tombol hamburger yang fixed di kiri atas.
                 * Label kiri berganti makna: di halaman server (node diketahui dari
                 * ServerContext) menampilkan node cluster, di halaman lain menampilkan
                 * nama panel dari settings — supaya header tidak pernah kosong.
                 */}
                <TopHeader css={tw`pl-16 xl:pl-4`}>
                    <div css={tw`flex items-center gap-3 min-w-0`}>
                        <span css={tw`text-2xs uppercase tracking-wider text-text-muted font-medium flex-shrink-0`}>
                            {node ? 'Cluster' : 'Panel'}
                        </span>
                        <ClusterBadge
                            title={node ? `Node aktif: ${node}` : 'Node aktif muncul saat kamu membuka sebuah server'}
                        >
                            <span
                                aria-hidden={'true'}
                                css={
                                    node
                                        ? tw`w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0`
                                        : tw`w-1.5 h-1.5 rounded-full bg-text-muted flex-shrink-0`
                                }
                            />
                            <span css={tw`truncate max-w-[12rem]`}>{node || name}</span>
                        </ClusterBadge>
                    </div>
                </TopHeader>

                <div css={tw`flex-1 flex flex-col`}>{children}</div>
            </div>
        </>
    );
};

export default AppShell;
