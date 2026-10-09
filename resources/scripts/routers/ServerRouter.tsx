import TransferListener from '@/components/server/TransferListener';
import React, { useEffect, useState } from 'react';
import { NavLink, Route, Switch, useRouteMatch } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import TransitionRouter from '@/TransitionRouter';
import WebsocketHandler from '@/components/server/WebsocketHandler';
import { ServerContext } from '@/state/server';
import { CSSTransition } from 'react-transition-group';
import Can from '@/components/elements/Can';
import Spinner from '@/components/elements/Spinner';
import { NotFound, ServerError } from '@/components/elements/ScreenBlock';
import { httpErrorToHuman } from '@/api/http';
import { useStoreState } from 'easy-peasy';
import SubNavigation from '@/components/elements/SubNavigation';
import InstallListener from '@/components/server/InstallListener';
import ServerBillingBanner from '@/components/server/ServerBillingBanner';
import ContentContainer from '@/components/elements/ContentContainer';
import ErrorBoundary from '@/components/elements/ErrorBoundary';
import MaterialIcon from '@/components/elements/MaterialIcon';
import { useLocation } from 'react-router';
import ConflictStateRenderer from '@/components/server/ConflictStateRenderer';
import PermissionRoute from '@/components/elements/PermissionRoute';
import routes from '@/routers/routes';
import tw from 'twin.macro';

export default () => {
    const match = useRouteMatch<{ id: string }>();
    const location = useLocation();

    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const [error, setError] = useState('');

    const id = ServerContext.useStoreState((state) => state.server.data?.id);
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const inConflictState = ServerContext.useStoreState((state) => state.server.inConflictState);
    const nodeName = ServerContext.useStoreState((state) => state.server.data?.node);
    const serverId = ServerContext.useStoreState((state) => state.server.data?.internalId);
    const getServer = ServerContext.useStoreActions((actions) => actions.server.getServer);
    const clearServerState = ServerContext.useStoreActions((actions) => actions.clearServerState);

    const to = (value: string, url = false) => {
        if (value === '/') {
            return url ? match.url : match.path;
        }
        return `${(url ? match.url : match.path).replace(/\/*$/, '')}/${value.replace(/^\/+/, '')}`;
    };

    useEffect(
        () => () => {
            clearServerState();
        },
        []
    );

    useEffect(() => {
        setError('');

        getServer(match.params.id).catch((error) => {
            console.error(error);
            setError(httpErrorToHuman(error));
        });

        return () => {
            clearServerState();
        };
    }, [match.params.id]);

    /*
     * Tab bar server ala brief-1: horizontal, di ATAS konten, bukan di sidebar.
     *
     * Sebelumnya daftar ini dirender vertikal di dalam sidebar AppShell. Brief-1
     * menaruhnya sebagai tab bar horizontal di bawah header halaman, dan sidebar
     * memang tidak punya seksi "Server". Karena itu sub-navigation server
     * dipindah ke sini; sidebar hanya menyisakan Dashboard/Store/Account/Admin.
     *
     * Varian `vertical` SubNavigation tidak berubah — DashboardRouter masih
     * memakainya untuk seksi "Account".
     */
    const serverSubNav =
        uuid && id ? (
            <CSSTransition timeout={150} classNames={'fade'} appear in>
                <SubNavigation>
                    {routes.server
                        .filter((route) => !!route.name)
                        .map((route) =>
                            route.permission ? (
                                <Can key={route.path} action={route.permission} matchAny>
                                    <NavLink to={to(route.path, true)} exact={route.exact}>
                                        {route.icon && <MaterialIcon name={route.icon} size={18} />}
                                        {route.name}
                                    </NavLink>
                                </Can>
                            ) : (
                                <NavLink key={route.path} to={to(route.path, true)} exact={route.exact}>
                                    {route.icon && <MaterialIcon name={route.icon} size={18} />}
                                    {route.name}
                                </NavLink>
                            )
                        )}
                    {rootAdmin && (
                        // eslint-disable-next-line react/jsx-no-target-blank
                        <a
                            href={`/admin/servers/view/${serverId}`}
                            target={'_blank'}
                            rel={'noreferrer'}
                            css={tw`ml-2`}
                        >
                            Admin
                            <MaterialIcon name={'open_in_new'} size={16} />
                        </a>
                    )}
                </SubNavigation>
            </CSSTransition>
        ) : null;

    return (
        <React.Fragment key={'server-router'}>
            <AppShell node={nodeName}>
                {!uuid || !id ? (
                    error ? (
                        <ServerError message={error} />
                    ) : (
                        <Spinner size={'large'} centered />
                    )
                ) : (
                    <>
                        <InstallListener />
                        <TransferListener />
                        <WebsocketHandler />
                        <ContentContainer css={tw`mt-4 xl:mt-6`}>
                            {serverSubNav}
                            {/* Banner billing realtime di atas semua tab server.
                                Tidak render apa pun bila server tak terikat billing. */}
                            <ServerBillingBanner />
                        </ContentContainer>
                        {inConflictState &&
                        (!rootAdmin || (rootAdmin && !location.pathname.endsWith(`/server/${id}`))) ? (
                            <ConflictStateRenderer />
                        ) : (
                            <ErrorBoundary>
                                <TransitionRouter>
                                    <Switch location={location}>
                                        {routes.server.map(({ path, permission, component: Component }) => (
                                            <PermissionRoute key={path} permission={permission} path={to(path)} exact>
                                                <Spinner.Suspense>
                                                    <Component />
                                                </Spinner.Suspense>
                                            </PermissionRoute>
                                        ))}
                                        <Route path={'*'} component={NotFound} />
                                    </Switch>
                                </TransitionRouter>
                            </ErrorBoundary>
                        )}
                    </>
                )}
            </AppShell>
        </React.Fragment>
    );
};
