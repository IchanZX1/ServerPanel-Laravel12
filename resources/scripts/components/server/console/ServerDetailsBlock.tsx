import React, { useEffect, useMemo, useState } from 'react';
import { bytesToString, ip, mbToBytes } from '@/lib/formatters';
import { ServerContext } from '@/state/server';
import { SocketEvent, SocketRequest } from '@/components/server/events';
import UptimeDuration from '@/components/server/UptimeDuration';
import StatBlock from '@/components/server/console/StatBlock';
import useWebsocketEvent from '@/plugins/useWebsocketEvent';
import classNames from 'classnames';
import { capitalize } from '@/lib/strings';

type Stats = Record<'memory' | 'cpu' | 'disk' | 'uptime' | 'rx' | 'tx', number>;

/**
 * Kelas bar progres saat pemakaian mendekati limit. Ambang batasnya
 * dipertahankan dari versi lama (>0.8 kuning, >0.9 merah), hanya kelas
 * warnanya yang dipindah ke token brief.
 */
const getBackgroundColor = (value: number, max: number | null): string | undefined => {
    const delta = !max ? 0 : value / max;

    if (delta > 0.8) {
        if (delta > 0.9) {
            return 'bg-danger';
        }
        return 'bg-warning';
    }

    return undefined;
};

/** Rasio 0–1 pemakaian terhadap limit; `null` kalau limit tak terbatas. */
const ratio = (value: number, max: number | null): number | null => (!max ? null : Math.min(1, value / max));

const Limit = ({ limit, children }: { limit: string | null; children: React.ReactNode }) => (
    <>
        {children}
        <span className={'ml-1 text-text-muted font-label-sm text-label-sm select-none'}>
            / {limit || <>&infin;</>}
        </span>
    </>
);

const ServerDetailsBlock = ({ className }: { className?: string }) => {
    const [stats, setStats] = useState<Stats>({ memory: 0, cpu: 0, disk: 0, uptime: 0, tx: 0, rx: 0 });

    const status = ServerContext.useStoreState((state) => state.status.value);
    const connected = ServerContext.useStoreState((state) => state.socket.connected);
    const instance = ServerContext.useStoreState((state) => state.socket.instance);
    const limits = ServerContext.useStoreState((state) => state.server.data!.limits);

    const textLimits = useMemo(
        () => ({
            cpu: limits?.cpu ? `${limits.cpu}%` : null,
            memory: limits?.memory ? bytesToString(mbToBytes(limits.memory)) : null,
            disk: limits?.disk ? bytesToString(mbToBytes(limits.disk)) : null,
        }),
        [limits]
    );

    const allocation = ServerContext.useStoreState((state) => {
        const match = state.server.data!.allocations.find((allocation) => allocation.isDefault);

        return !match ? 'n/a' : `${match.alias || ip(match.ip)}:${match.port}`;
    });

    useEffect(() => {
        if (!connected || !instance) {
            return;
        }

        instance.send(SocketRequest.SEND_STATS);
    }, [instance, connected]);

    useWebsocketEvent(SocketEvent.STATS, (data) => {
        let stats: any = {};
        try {
            stats = JSON.parse(data);
        } catch (e) {
            return;
        }

        setStats({
            memory: stats.memory_bytes,
            cpu: stats.cpu_absolute,
            disk: stats.disk_bytes,
            tx: stats.network.tx_bytes,
            rx: stats.network.rx_bytes,
            uptime: stats.uptime || 0,
        });
    });

    const cpuRatio = ratio(stats.cpu, limits.cpu);
    const memoryRatio = ratio(stats.memory / 1024, limits.memory * 1024);
    const diskRatio = ratio(stats.disk / 1024, limits.disk * 1024);

    const pct = (value: number | null) => (value === null ? null : `${(value * 100).toFixed(1)}% Limit`);

    return (
        <div className={classNames('flex flex-col gap-2.5', className)}>
            <StatBlock name={'lan'} title={'Server Address'} copyOnClick={allocation}>
                <span className={'text-brand truncate'}>{allocation}</span>
            </StatBlock>
            <StatBlock
                name={'schedule'}
                title={'Uptime'}
                color={getBackgroundColor(status === 'running' ? 0 : status !== 'offline' ? 9 : 10, 10)}
            >
                {status === null ? (
                    'Offline'
                ) : stats.uptime > 0 ? (
                    <UptimeDuration uptime={stats.uptime / 1000} />
                ) : (
                    capitalize(status)
                )}
            </StatBlock>
            <StatBlock
                name={'memory'}
                title={'CPU Load'}
                color={getBackgroundColor(stats.cpu, limits.cpu)}
                progress={cpuRatio}
                chip={pct(cpuRatio)}
            >
                {status === 'offline' ? (
                    <span className={'text-text-muted font-medium'}>Offline</span>
                ) : (
                    <Limit limit={textLimits.cpu}>{stats.cpu.toFixed(2)}%</Limit>
                )}
            </StatBlock>
            <StatBlock
                name={'memory_alt'}
                title={'Memory'}
                color={getBackgroundColor(stats.memory / 1024, limits.memory * 1024)}
                progress={memoryRatio}
                chip={pct(memoryRatio)}
                chipTone={'cyan'}
            >
                {status === 'offline' ? (
                    <span className={'text-text-muted font-medium'}>Offline</span>
                ) : (
                    <Limit limit={textLimits.memory}>{bytesToString(stats.memory)}</Limit>
                )}
            </StatBlock>
            <StatBlock
                name={'hard_drive'}
                title={'Disk Storage'}
                color={getBackgroundColor(stats.disk / 1024, limits.disk * 1024)}
                progress={diskRatio}
                chip={pct(diskRatio)}
                chipTone={'tertiary'}
            >
                <Limit limit={textLimits.disk}>{bytesToString(stats.disk)}</Limit>
            </StatBlock>
            <StatBlock name={'cloud_download'} title={'Network Inbound'}>
                {status === 'offline' ? (
                    <span className={'text-text-muted font-medium'}>Offline</span>
                ) : (
                    <span className={'inline-flex items-center gap-2'}>
                        <span className={'text-warning'}>{bytesToString(stats.rx)}</span>
                        <span
                            className={
                                'font-label-micro text-label-micro text-warning bg-warning-bg px-2 py-0.5 rounded font-semibold'
                            }
                        >
                            RX
                        </span>
                    </span>
                )}
            </StatBlock>
            <StatBlock name={'cloud_upload'} title={'Network Outbound'}>
                {status === 'offline' ? (
                    <span className={'text-text-muted font-medium'}>Offline</span>
                ) : (
                    <span className={'inline-flex items-center gap-2'}>
                        <span className={'text-cyan-400'}>{bytesToString(stats.tx)}</span>
                        <span
                            className={
                                'font-label-micro text-label-micro text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded font-semibold'
                            }
                        >
                            TX
                        </span>
                    </span>
                )}
            </StatBlock>
        </div>
    );
};

export default ServerDetailsBlock;
