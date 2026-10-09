import React, { memo } from 'react';
import { ServerContext } from '@/state/server';
import Can from '@/components/elements/Can';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import isEqual from 'react-fast-compare';
import Spinner from '@/components/elements/Spinner';
import Features from '@feature/Features';
import Console from '@/components/server/console/Console';
import StatGraphs from '@/components/server/console/StatGraphs';
import PowerButtons from '@/components/server/console/PowerButtons';
import ServerDetailsBlock from '@/components/server/console/ServerDetailsBlock';
import { Alert } from '@/components/elements/alert';
import tw from 'twin.macro';

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

const ServerConsoleContainer = () => {
    const name = ServerContext.useStoreState((state) => state.server.data!.name);
    const description = ServerContext.useStoreState((state) => state.server.data!.description);
    const isInstalling = ServerContext.useStoreState((state) => state.server.isInstalling);
    const isTransferring = ServerContext.useStoreState((state) => state.server.data!.isTransferring);
    const eggFeatures = ServerContext.useStoreState((state) => state.server.data!.eggFeatures, isEqual);
    const isNodeUnderMaintenance = ServerContext.useStoreState((state) => state.server.data!.isNodeUnderMaintenance);

    return (
        <ServerContentBlock title={'Console'}>
            {(isNodeUnderMaintenance || isInstalling || isTransferring) && (
                <Alert type={'warning'} className={'mb-4'}>
                    {isNodeUnderMaintenance
                        ? 'The node of this server is currently under maintenance and all actions are unavailable.'
                        : isInstalling
                        ? 'This server is currently running its installation process and most actions are unavailable.'
                        : 'This server is currently being transferred to another node and all actions are unavailable.'}
                </Alert>
            )}
            <div
                css={tw`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-surface-card p-space-md rounded-xl shadow-md`}
            >
                <div css={tw`flex flex-col min-w-0`}>
                    <div css={tw`flex items-center gap-3`}>
                        <h1
                            css={tw`font-headline-md text-headline-md text-text-primary tracking-tight truncate`}
                        >
                            {name}
                        </h1>
                        <span
                            css={tw`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success-bg text-success font-label-micro text-label-micro uppercase font-bold tracking-widest flex-shrink-0`}
                        >
                            <span css={tw`w-1.5 h-1.5 rounded-full bg-success animate-pulse`} />
                            Running
                        </span>
                    </div>
                    <p css={tw`font-body-md text-body-md text-text-secondary mt-1 truncate`}>{description}</p>
                </div>
                <div css={tw`self-start md:self-auto`}>
                    <Can action={['control.start', 'control.stop', 'control.restart']} matchAny>
                        <PowerButtons className={'flex items-center gap-2'} />
                    </Can>
                </div>
            </div>
            <div className={'grid grid-cols-1 lg:grid-cols-4 gap-space-lg mb-6'}>
                <div className={'flex lg:col-span-3'}>
                    <Spinner.Suspense>
                        <Console />
                    </Spinner.Suspense>
                </div>
                <ServerDetailsBlock className={'lg:col-span-1'} />
            </div>
            <div className={'grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4'}>
                <Spinner.Suspense>
                    <StatGraphs />
                </Spinner.Suspense>
            </div>
            <Features enabled={eggFeatures} />
        </ServerContentBlock>
    );
};

export default memo(ServerConsoleContainer, isEqual);
