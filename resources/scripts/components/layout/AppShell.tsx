import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBars,
    faCogs,
    faLayerGroup,
    faSignOutAlt,
    faShoppingCart,
    faTimes,
    faUser,
} from '@fortawesome/free-solid-svg-icons';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import SearchContainer from '@/components/dashboard/search/SearchContainer';
import tw, { theme } from 'twin.macro';
import styled from 'styled-components/macro';
import http from '@/api/http';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import useEventListener from '@/plugins/useEventListener';
import { breakpoint } from '@/theme';
// Aset di-import lewat webpack (svg-url-loader) — sama seperti LoginFormContainer.
import logo from '@/assets/images/pterodactyl.svg';

interface Props {
    /** Tab kontekstual (mis. daftar halaman /account atau /server/:id) yang tampil di dalam sidebar. */
    subNavigation?: React.ReactNode;
}

/**
 * Styling bersama untuk semua baris navigasi sidebar. Memakai pola descendant
 * selector yang sama seperti NavigationBar lama, supaya SearchContainer dan
 * ikon apa pun yang dirender sebagai anak langsung bisa ikut ter-style tanpa
 * perlu tahu soal sidebar.
 */
const NavList = styled.div`
    ${tw`flex flex-col gap-1 px-3`};

    & > a,
    & > button,
    & > .navigation-link {
        ${tw`flex items-center w-full px-4 py-2.5 rounded-md text-sm font-medium text-left text-neutral-300 no-underline bg-transparent border-0 cursor-pointer transition-colors duration-150`};

        & > svg {
            ${tw`w-4 h-4 mr-3 flex-shrink-0`};
        }

        &:hover {
            ${tw`text-neutral-100 bg-neutral-800`};
        }

        &.active {
            ${tw`text-neutral-100 bg-black`};
        }

        &:focus-visible {
            ${tw`outline-none ring-2 ring-cyan-400 ring-offset-2 ring-offset-neutral-900`};
        }
    }
`;

const NavItem = styled(NavLink)`
    &.active {
        box-shadow: inset 2px 0 ${theme`colors.cyan.500`.toString()};
    }
`;

// Catatan: JANGAN pakai utility translate Twin (`-translate-x-full`) di sini.
// Tailwind v2 memisahkan `--tw-translate-x` dari `--tw-transform`, dan `tw`-macro
// tidak memancarkan definisi `--tw-transform`, sehingga transform-nya jadi tidak
// valid dan sidebar tidak pernah benar-benar bergeser. Tulis transform eksplisit.
const Sidebar = styled.nav<{ $open: boolean }>`
    ${tw`fixed top-0 left-0 z-40 flex flex-col h-screen w-64 bg-neutral-900 border-r border-neutral-800 overflow-hidden`};
    transform: translateX(-100%);
    transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    will-change: transform;

    ${breakpoint('xl')`
        transform: translateX(0);
    `};

    ${(props) => props.$open && 'transform: translateX(0);'};
`;

const AppShell: React.FC<Props> = ({ subNavigation, children }) => {
    const name = useStoreState((state: ApplicationStore) => state.settings.data!.name);
    const rootAdmin = useStoreState((state: ApplicationStore) => state.user.data!.rootAdmin);

    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

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
                css={tw`xl:hidden fixed top-3 left-3 z-50 flex items-center justify-center w-10 h-10 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-200 shadow-ds-1 transition-colors duration-150 hover:text-white hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
            >
                <FontAwesomeIcon icon={open ? faTimes : faBars} aria-hidden={'true'} />
            </button>

            {open && (
                <div
                    aria-hidden={'true'}
                    onClick={() => setOpen(false)}
                    css={tw`xl:hidden fixed inset-0 z-30 bg-black bg-opacity-60`}
                />
            )}

            <Sidebar ref={sidebarRef} id={'app-sidebar'} $open={open} aria-label={'Navigasi utama'}>
                <div css={tw`flex items-center h-14 px-4 border-b border-neutral-800 flex-shrink-0`}>
                    <Link
                        to={'/'}
                        css={tw`flex items-center gap-2 no-underline rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
                    >
                        <img src={logo} alt={''} aria-hidden={'true'} css={tw`w-7 h-7 flex-shrink-0 block`} />
                        <span css={tw`font-semibold text-sm tracking-wide text-neutral-100 truncate`}>{name}</span>
                    </Link>
                </div>

                <div css={tw`flex-1 flex flex-col overflow-y-auto py-4`}>
                    <NavList>
                        <NavItem to={'/'} exact>
                            <FontAwesomeIcon icon={faLayerGroup} aria-hidden={'true'} />
                            Dashboard
                        </NavItem>
                        <NavItem to={'/store'} exact>
                            <FontAwesomeIcon icon={faShoppingCart} aria-hidden={'true'} />
                            Store
                        </NavItem>
                        <NavItem to={'/account'}>
                            <FontAwesomeIcon icon={faUser} aria-hidden={'true'} />
                            Account Settings
                        </NavItem>
                        {rootAdmin && (
                            <a href={'/admin'} rel={'noreferrer'}>
                                <FontAwesomeIcon icon={faCogs} aria-hidden={'true'} />
                                Admin Panel
                            </a>
                        )}
                        <SearchContainer label={'Cari Server'} />
                    </NavList>

                    {subNavigation}
                </div>

                <NavList css={tw`py-3 border-t border-neutral-800 flex-shrink-0`}>
                    <button type={'button'} onClick={onTriggerLogout}>
                        <FontAwesomeIcon icon={faSignOutAlt} aria-hidden={'true'} />
                        Sign Out
                    </button>
                </NavList>
            </Sidebar>

            {/* pt-14 di mobile memberi ruang untuk tombol hamburger yang fixed. */}
            <div css={tw`min-h-screen flex flex-col xl:pl-64`}>
                <div css={tw`flex-1 flex flex-col pt-14 xl:pt-0`}>{children}</div>
            </div>
        </>
    );
};

export default AppShell;
