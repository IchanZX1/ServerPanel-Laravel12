import React, { useEffect, useState } from 'react';
import { Server } from '@/api/server/getServer';
import getServers from '@/api/getServers';
import ServerRow from '@/components/dashboard/ServerRow';
import Spinner from '@/components/elements/Spinner';
import PageContentBlock from '@/components/elements/PageContentBlock';
import useFlash from '@/plugins/useFlash';
import { useStoreState } from 'easy-peasy';
import { usePersistedState } from '@/plugins/usePersistedState';
import MaterialIcon from '@/components/elements/MaterialIcon';
import EmailVerificationBanner from '@/components/elements/EmailVerificationBanner';
import tw from 'twin.macro';
import useSWR from 'swr';
import { PaginatedResult } from '@/api/http';
import Pagination from '@/components/elements/Pagination';
import { useHistory, useLocation } from 'react-router-dom';

export default () => {
    const { search } = useLocation();
    const history = useHistory();
    const defaultPage = Number(new URLSearchParams(search).get('page') || '1');

    const [page, setPage] = useState(!isNaN(defaultPage) && defaultPage > 0 ? defaultPage : 1);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const uuid = useStoreState((state) => state.user.data!.uuid);
    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const [showOnlyAdmin, setShowOnlyAdmin] = usePersistedState(`${uuid}:show_all_servers`, false);

    const { data: servers, error } = useSWR<PaginatedResult<Server>>(
        ['/api/client/servers', showOnlyAdmin && rootAdmin, page],
        () => getServers({ page, type: showOnlyAdmin && rootAdmin ? 'admin' : undefined })
    );

    useEffect(() => {
        setPage(1);
    }, [showOnlyAdmin]);

    useEffect(() => {
        if (!servers) return;
        if (servers.pagination.currentPage > 1 && !servers.items.length) {
            setPage(1);
        }
    }, [servers?.pagination.currentPage]);

    useEffect(() => {
        // Don't use react-router to handle changing this part of the URL, otherwise it
        // triggers a needless re-render. We just want to track this in the URL incase the
        // user refreshes the page.
        window.history.replaceState(null, document.title, `/${page <= 1 ? '' : `?page=${page}`}`);
    }, [page]);

    useEffect(() => {
        if (error) clearAndAddHttpError({ key: 'dashboard', error });
        if (!error) clearFlashes('dashboard');
    }, [error]);

    return (
        <PageContentBlock title={'Dashboard'} showFlashKey={'dashboard'}>
            <div css={tw`flex flex-col w-full gap-6`}>
                <EmailVerificationBanner />

                {/* ---- Header halaman ---- */}
                <div css={tw`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
                    <div css={tw`flex flex-col gap-1`}>
                        <div css={tw`flex items-center gap-2.5`}>
                            <h1 css={tw`font-headline-lg text-headline-lg text-text-primary tracking-tight`}>
                                Dashboard
                            </h1>
                            <span
                                css={tw`inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-0.5 font-label-micro text-label-micro text-text-secondary`}
                            >
                                <span css={tw`h-1.5 w-1.5 rounded-full bg-brand animate-pulse`} />
                                REALTIME
                            </span>
                        </div>
                        <p css={tw`font-body-md text-body-md text-text-muted`}>
                            Kelola instance virtual, alokasi jaringan, dan telemetri pemakaian daya komputasi.
                        </p>
                    </div>

                    {rootAdmin && (
                        /*
                         * Pill admin-toggle brief-2. `Switch` lama tidak dipakai di sini
                         * karena bentuknya beda (brief pakai track 24x44 + knob bulat);
                         * ganti ke input checkbox + sibling agar bisa `peer-checked:`.
                         */
                        <div
                            css={tw`flex items-center gap-3 self-end sm:self-center rounded-xl bg-surface-card px-4 py-2.5 shadow-md`}
                        >
                            <div css={tw`flex flex-col items-end`}>
                                <span
                                    css={tw`font-label-micro text-label-micro tracking-widest uppercase text-text-muted`}
                                >
                                    {showOnlyAdmin ? "SHOWING OTHERS' SERVERS" : 'SHOWING YOUR SERVERS'}
                                </span>
                            </div>
                            <label css={tw`relative inline-flex cursor-pointer items-center`}>
                                <input
                                    type={'checkbox'}
                                    className={'peer sr-only'}
                                    name={'show_all_servers'}
                                    checked={showOnlyAdmin}
                                    onChange={() => setShowOnlyAdmin((s) => !s)}
                                    aria-label={'Tampilkan server milik pengguna lain'}
                                />
                                <div
                                    css={tw`h-6 w-11 rounded-full bg-surface-container-highest transition-colors peer-checked:bg-cyan-600 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-text-primary after:transition-all after:content-[''] peer-checked:after:translate-x-full`}
                                />
                            </label>
                        </div>
                    )}
                </div>

                {!servers ? (
                    <Spinner centered size={'large'} />
                ) : (
                    <Pagination data={servers} onPageSelect={setPage}>
                        {({ items }) =>
                            items.length > 0 ? (
                                <div css={tw`flex flex-col gap-3`}>
                                    {items.map((server) => (
                                        <ServerRow key={server.uuid} server={server} />
                                    ))}
                                </div>
                            ) : (
                                <div css={tw`text-center py-8`}>
                                    {showOnlyAdmin ? (
                                        <p css={tw`font-body-sm text-body-sm text-text-muted`}>
                                            There are no other servers to display.
                                        </p>
                                    ) : (
                                        <>
                                            <p css={tw`font-headline-sm text-headline-sm text-text-primary`}>
                                                Kamu belum punya server
                                            </p>
                                            <p css={tw`font-body-sm text-body-sm text-text-muted mt-1`}>
                                                Beli server game dengan harga terjangkau dan murah — aktif otomatis
                                                setelah pembayaran.
                                            </p>
                                            <button
                                                type={'button'}
                                                onClick={() => history.push('/store')}
                                                aria-label={'Beli server sekarang'}
                                                css={tw`mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 font-label-md text-label-md font-semibold text-text-primary transition-colors hover:bg-cyan-500`}
                                            >
                                                <MaterialIcon name={'shopping_cart_checkout'} size={18} />
                                                Beli Server
                                            </button>
                                        </>
                                    )}
                                </div>
                            )
                        }
                    </Pagination>
                )}
            </div>
        </PageContentBlock>
    );
};
