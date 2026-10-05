import React from 'react';
import { NavLink, Route, Switch } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import DashboardContainer from '@/components/dashboard/DashboardContainer';
import { NotFound } from '@/components/elements/ScreenBlock';
import TransitionRouter from '@/TransitionRouter';
import SubNavigation from '@/components/elements/SubNavigation';
import { useLocation } from 'react-router';
import Spinner from '@/components/elements/Spinner';
import routes from '@/routers/routes';
import StoreContainer from '@/components/dashboard/store/StoreContainer';
import InvoiceContainer from '@/components/dashboard/store/InvoiceContainer';

export default () => {
    const location = useLocation();

    const accountSubNav =
        location.pathname.startsWith('/account') &&
        (
            <SubNavigation vertical title={'Account'}>
                {routes.account
                    .filter((route) => !!route.name)
                    .map(({ path, name, exact = false }) => (
                        <NavLink key={path} to={`/account/${path}`.replace('//', '/')} exact={exact}>
                            {name}
                        </NavLink>
                    ))}
            </SubNavigation>
        );

    return (
        <AppShell subNavigation={accountSubNav as React.ReactNode}>
            <TransitionRouter>
                <React.Suspense fallback={<Spinner centered />}>
                    <Switch location={location}>
                        <Route path={'/'} exact>
                            <DashboardContainer />
                        </Route>
                        <Route path={'/store'} exact>
                            <StoreContainer />
                        </Route>
                        <Route path={'/store/invoice/:invoiceId'} exact>
                            <InvoiceContainer />
                        </Route>
                        {routes.account.map(({ path, component: Component }) => (
                            <Route key={path} path={`/account/${path}`.replace('//', '/')} exact>
                                <Component />
                            </Route>
                        ))}
                        <Route path={'*'}>
                            <NotFound />
                        </Route>
                    </Switch>
                </React.Suspense>
            </TransitionRouter>
        </AppShell>
    );
};
