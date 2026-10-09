import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { Server } from '@/api/server/getServer';
import getServerResourceUsage, { ServerPowerState, ServerStats } from '@/api/server/getServerResourceUsage';
import { bytesToString, ip, mbToBytes } from '@/lib/formatters';
import tw from 'twin.macro';
import Spinner from '@/components/elements/Spinner';
import MaterialIcon from '@/components/elements/MaterialIcon';
import styled from 'styled-components/macro';

// Determines if the current value is in an alarm threshold so we can show it in red rather
// than the more faded default style.
const isAlarmState = (current: number, limit: number): boolean => limit > 0 && current / (limit * 1024 * 1024) >= 0.9;

type TileTone = 'brand' | 'success' | 'cyan' | 'danger';

/**
 * Warna bar progres tiap metrik. Brief-2 memakai tiga warna berbeda untuk
 * CPU/Memory/Disk supaya tile-nya mudah dibedakan sekilas; saat nilainya
 * menembus ambang alarm, semuanya jatuh ke `danger` (perilaku lama dipertahankan).
 */
const tileFill: Record<TileTone, string> = {
    brand: 'bg-brand',
    success: 'bg-success',
    cyan: 'bg-cyan-500',
    danger: 'bg-danger',
};

const Card = styled.div<{ $status: ServerPowerState | undefined }>`
    /*
     * "group" tidak bisa lewat twin.macro (harus jadi className), jadi kelasnya
     * ditulis di render site lewat classNames('group', className).
     */
    ${tw`relative overflow-hidden rounded-xl bg-surface-card p-space-md shadow-sm transition-colors duration-200 hover:bg-surface-hover`};

    /*
     * Strip status di tepi KIRI (brief-2). Versi lama menaruhnya di kanan dan
     * memakai GreyRowBox; kartu ini menggantikannya, jadi strip-nya ikut pindah.
     */
    & .status-strip {
        ${tw`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-150`};

        ${({ $status }) =>
            !$status || $status === 'offline'
                ? tw`bg-danger`
                : $status === 'running'
                ? tw`bg-success shadow-[0_0_12px_rgba(16,185,129,0.4)]`
                : tw`bg-warning`};
    }
`;

const Tile = styled.div`
    ${tw`flex flex-col rounded-lg bg-surface-container-lowest/60 p-2.5`};
`;

const TileHead = styled.div`
    ${tw`flex items-center justify-between text-text-muted mb-1 font-label-micro text-label-micro uppercase tracking-wider`};
`;

const TileValue = styled.span`
    ${tw`font-title-md text-title-md text-text-primary font-mono`};
`;

const TileCaption = styled.span`
    ${tw`font-label-micro text-label-micro text-text-muted`};
`;

const TileTrack = styled.div`
    ${tw`mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-container-highest`};
`;

const Chip = styled.span<{ $kind: 'online' | 'neutral' | 'warning' | 'danger' }>`
    ${tw`rounded px-2 py-0.5 font-label-micro text-label-micro uppercase font-bold flex-shrink-0`};

    ${({ $kind }) =>
        $kind === 'online'
            ? tw`bg-success-bg text-success`
            : $kind === 'warning'
            ? tw`bg-warning-bg text-warning`
            : $kind === 'danger'
            ? tw`bg-danger-bg text-danger`
            : tw`bg-surface-container-high text-text-tertiary`};
`;

type Timer = ReturnType<typeof setInterval>;

export default ({ server, className }: { server: Server; className?: string }) => {
    const interval = useRef<Timer>(null) as React.MutableRefObject<Timer>;
    const [isSuspended, setIsSuspended] = useState(server.status === 'suspended');
    const [stats, setStats] = useState<ServerStats | null>(null);

    const getStats = () =>
        getServerResourceUsage(server.uuid)
            .then((data) => setStats(data))
            .catch((error) => console.error(error));

    useEffect(() => {
        setIsSuspended(stats?.isSuspended || server.status === 'suspended');
    }, [stats?.isSuspended, server.status]);

    useEffect(() => {
        // Don't waste a HTTP request if there is nothing important to show to the user because
        // the server is suspended.
        if (isSuspended || server.isNodeUnderMaintenance) return;

        getStats().then(() => {
            interval.current = setInterval(() => getStats(), 30000);
        });

        return () => {
            interval.current && clearInterval(interval.current);
        };
    }, [isSuspended, server.isNodeUnderMaintenance]);

    const alarms = { cpu: false, memory: false, disk: false };
    if (stats) {
        alarms.cpu = server.limits.cpu === 0 ? false : stats.cpuUsagePercent >= server.limits.cpu * 0.9;
        alarms.memory = isAlarmState(stats.memoryUsageInBytes, server.limits.memory);
        alarms.disk = server.limits.disk === 0 ? false : isAlarmState(stats.diskUsageInBytes, server.limits.disk);
    }

    const diskLimit = server.limits.disk !== 0 ? bytesToString(mbToBytes(server.limits.disk)) : 'Unlimited';
    const memoryLimit = server.limits.memory !== 0 ? bytesToString(mbToBytes(server.limits.memory)) : 'Unlimited';
    const cpuLimit = server.limits.cpu !== 0 ? server.limits.cpu + ' %' : 'Unlimited';

    const defaultAllocation = server.allocations.find((alloc) => alloc.isDefault);
    const address = defaultAllocation
        ? `${defaultAllocation.alias || ip(defaultAllocation.ip)}:${defaultAllocation.port}`
        : null;

    // Persentase pemakaian terhadap limit. Dipakai untuk lebar bar di tiap tile;
    // `null` kalau limit 0 (unlimited) supaya bar tidak menyesatkan.
    const ratio = (used: number, limit: number) => (limit > 0 ? Math.min(100, (used / limit) * 100) : null);

    const memoryRatio = stats ? ratio(stats.memoryUsageInBytes, server.limits.memory * 1024 * 1024) : null;
    const diskRatio = stats ? ratio(stats.diskUsageInBytes, server.limits.disk * 1024 * 1024) : null;
    const cpuRatio = stats && server.limits.cpu > 0 ? Math.min(100, (stats.cpuUsagePercent / server.limits.cpu) * 100) : null;

    /*
     * Cabang status non-aktif (suspended / maintenance / transferring / installing).
     * Semuanya dipertahankan dari versi lama, hanya bentuknya jadi chip di dalam
     * kartu — bukan blok terpusat seperti sebelumnya.
     *
     * Catatan: `server.status` TIDAK pernah bernilai 'running' (lihat
     * api/server/types.d.ts) — status daya yang sebenarnya ada di `stats.status`.
     * Jadi di sini cukup cek null/tidaknya, bukan bandingkan dengan 'running'.
     */
    let stateChip: { kind: 'neutral' | 'warning' | 'danger'; label: string } | null = null;
    if (isSuspended) {
        stateChip = { kind: 'danger', label: server.status === 'suspended' ? 'Suspended' : 'Connection Error' };
    } else if (server.isNodeUnderMaintenance) {
        stateChip = { kind: 'warning', label: 'Under Maintenance' };
    } else if (server.isTransferring || server.status) {
        stateChip = {
            kind: 'neutral',
            label: server.isTransferring
                ? 'Transferring'
                : server.status === 'installing'
                ? 'Installing'
                : server.status === 'restoring_backup'
                ? 'Restoring Backup'
                : 'Unavailable',
        };
    }

    // Saat server sedang installing/transferring/maintenance, versi lama
    // menampilkan chip status ALIH-ALIH metrik. Perilaku itu dipertahankan:
    // kalau ada stateChip, tile metrik tidak dirender.
    const showMetrics = !!stats && !stateChip;

    return (
        <Card as={Link} to={`/server/${server.id}`} className={classNames('group', className)} $status={stats?.status}>
            <div className={'status-strip'} />

            <div css={tw`grid grid-cols-1 lg:grid-cols-12 items-center gap-4 pl-3`}>
                {/* ---- Info server ---- */}
                <div css={tw`lg:col-span-5 flex items-start sm:items-center gap-3.5 min-w-0`}>
                    <div
                        css={tw`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-brand`}
                    >
                        <MaterialIcon name={'dns'} size={22} />
                    </div>
                    <div css={tw`flex flex-col min-w-0`}>
                        <div css={tw`flex items-center gap-2`}>
                            <span css={tw`font-headline-sm text-headline-sm text-text-primary truncate`}>
                                {server.name}
                            </span>
                            {stateChip ? (
                                <Chip $kind={stateChip.kind}>{stateChip.label}</Chip>
                            ) : stats?.status === 'running' ? (
                                <Chip $kind={'online'}>Online</Chip>
                            ) : (
                                <Chip $kind={'neutral'}>Offline</Chip>
                            )}
                        </div>
                        {!!server.description && (
                            <p css={tw`font-body-sm text-body-sm text-text-secondary truncate`}>
                                {server.description}
                            </p>
                        )}
                        {address && (
                            <div css={tw`mt-1 flex items-center gap-1.5 font-label-micro text-label-micro`}>
                                <MaterialIcon name={'lan'} size={14} css={tw`text-cyan-400`} />
                                <span css={tw`font-mono text-text-tertiary`}>{address}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ---- Metrik ---- */}
                <div css={tw`lg:col-span-5 grid grid-cols-3 gap-2`}>
                    {showMetrics ? (
                        <React.Fragment>
                            <Tile>
                                <TileHead>
                                    <span css={tw`flex items-center gap-1`}>
                                        <MaterialIcon name={'memory'} size={14} /> CPU
                                    </span>
                                    <span css={tw`text-brand`}>{cpuRatio !== null ? `${cpuRatio.toFixed(1)}%` : '—'}</span>
                                </TileHead>
                                <TileValue>{stats!.cpuUsagePercent.toFixed(1)}%</TileValue>
                                <TileCaption>of {cpuLimit} Limit</TileCaption>
                                <TileTrack>
                                    <div
                                        className={tileFill[alarms.cpu ? 'danger' : 'brand']}
                                        style={{ height: '100%', width: `${cpuRatio ?? 0}%` }}
                                    />
                                </TileTrack>
                            </Tile>
                            <Tile>
                                <TileHead>
                                    <span css={tw`flex items-center gap-1`}>
                                        <MaterialIcon name={'memory_alt'} size={14} /> Memory
                                    </span>
                                    <span css={tw`text-success`}>
                                        {memoryRatio !== null ? `${memoryRatio.toFixed(1)}%` : '—'}
                                    </span>
                                </TileHead>
                                <TileValue>{bytesToString(stats!.memoryUsageInBytes)}</TileValue>
                                <TileCaption>of {memoryLimit}</TileCaption>
                                <TileTrack>
                                    <div
                                        className={tileFill[alarms.memory ? 'danger' : 'success']}
                                        style={{ height: '100%', width: `${memoryRatio ?? 0}%` }}
                                    />
                                </TileTrack>
                            </Tile>
                            <Tile>
                                <TileHead>
                                    <span css={tw`flex items-center gap-1`}>
                                        <MaterialIcon name={'hard_drive'} size={14} /> Disk
                                    </span>
                                    <span css={tw`text-text-secondary`}>
                                        {diskRatio !== null ? `${diskRatio.toFixed(1)}%` : '—'}
                                    </span>
                                </TileHead>
                                <TileValue>{bytesToString(stats!.diskUsageInBytes)}</TileValue>
                                <TileCaption>of {diskLimit}</TileCaption>
                                <TileTrack>
                                    <div
                                        className={tileFill[alarms.disk ? 'danger' : 'cyan']}
                                        style={{ height: '100%', width: `${diskRatio ?? 0}%` }}
                                    />
                                </TileTrack>
                            </Tile>
                        </React.Fragment>
                    ) : (
                        <div css={tw`col-span-3 flex items-center justify-center py-3`}>
                            {isSuspended || server.isNodeUnderMaintenance || stateChip ? (
                                <span css={tw`font-body-sm text-body-sm text-text-muted`}>
                                    Telemetri tidak tersedia.
                                </span>
                            ) : (
                                <Spinner size={'small'} />
                            )}
                        </div>
                    )}
                </div>

                {/* ---- Aksi ----
                    Seluruh kartu sudah berupa <Link>, jadi kedua tombol ikon di
                    bawah ini tidak boleh jadi <Link> bersarang — pakai <span>
                    dengan ikon saja, supaya tidak ada anchor di dalam anchor. */}
                <div css={tw`lg:col-span-2 flex items-center justify-end gap-2`}>
                    <span
                        title={'Konsol server'}
                        css={tw`flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-high text-on-surface transition-colors group-hover:bg-surface-active`}
                    >
                        <MaterialIcon name={'terminal'} size={18} />
                    </span>
                    <span
                        title={'Kelola server'}
                        css={tw`flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-high text-on-surface transition-colors group-hover:bg-surface-active`}
                    >
                        <MaterialIcon name={'settings'} size={18} />
                    </span>
                    <span
                        css={tw`flex h-9 items-center gap-1.5 rounded-lg bg-cyan-600 px-3 font-label-sm text-label-sm font-semibold text-text-primary transition-colors group-hover:bg-cyan-500`}
                    >
                        Manage
                        <MaterialIcon name={'arrow_forward'} size={16} />
                    </span>
                </div>
            </div>
        </Card>
    );
};
