import React from 'react';
import MaterialIcon from '@/components/elements/MaterialIcon';
import classNames from 'classnames';
import styles from './style.module.css';
import CopyOnClick from '@/components/elements/CopyOnClick';

interface StatBlockProps {
    title: string;
    copyOnClick?: string;
    color?: string | undefined;
    /** Nama ligature Material Symbols (brief-1). Dulu `IconDefinition` FontAwesome. */
    name: string;
    /**
     * Rasio 0–1 pemakaian terhadap limit. Bila diisi, kartu menampilkan bar
     * progres (brief-1). `undefined` = tidak ada bar (Address, Uptime, Network).
     */
    progress?: number | null;
    /** Chip kecil di kanan judul, mis. "8.5% Limit" atau "RX". */
    chip?: React.ReactNode;
    /** Chip diwarnai beda dari label utama (Network Inbound = warning). */
    chipTone?: 'brand' | 'cyan' | 'warning' | 'tertiary';
    children: React.ReactNode;
    className?: string;
}

/**
 * Satu kartu statistik di kolom kanan Console.
 *
 * `useFitText` sengaja TIDAK dipakai lagi: brief-1 mematok ukuran nilai
 * (font-mono title-md) alih-alih mengecilkan font sampai muat, dan alamat
 * server panjang sekarang di-`truncate` seperti di mockup.
 */
export default ({
    title,
    copyOnClick,
    name,
    color,
    progress,
    chip,
    chipTone = 'brand',
    className,
    children,
}: StatBlockProps) => (
    <CopyOnClick text={copyOnClick}>
        <div className={classNames(styles.stat_block, className)}>
            <div className={classNames(styles.status_bar, color || 'bg-cyan-500/80')} />
            <div className={classNames(styles.icon, color || 'bg-surface-container-lowest')}>
                <MaterialIcon name={name} size={20} className={'text-text-primary'} />
            </div>
            <div className={'flex flex-col justify-center overflow-hidden w-full'}>
                <div className={'flex items-center justify-between gap-2'}>
                    <p className={'font-label-micro text-label-micro uppercase tracking-wider text-text-muted'}>
                        {title}
                    </p>
                    {chip && (
                        <span
                            className={classNames(
                                'font-label-micro text-label-micro font-bold flex-shrink-0',
                                chipTone === 'brand' && 'text-brand',
                                chipTone === 'cyan' && 'text-cyan-400',
                                chipTone === 'warning' && 'text-warning',
                                chipTone === 'tertiary' && 'text-text-tertiary'
                            )}
                        >
                            {chip}
                        </span>
                    )}
                </div>
                <div className={'font-mono font-title-md text-title-md font-bold text-text-primary truncate mt-1'}>
                    {children}
                </div>
                {progress !== undefined && progress !== null && (
                    <div className={'w-full bg-surface-container-lowest h-1.5 rounded-full mt-2 overflow-hidden'}>
                        <div
                            className={classNames('h-full rounded-full', color ? color.split(' ')[0] : 'bg-brand')}
                            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    </CopyOnClick>
);
