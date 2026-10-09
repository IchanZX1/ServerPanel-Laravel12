import React from 'react';
import classNames from 'classnames';
import MaterialIcon from '@/components/elements/MaterialIcon';
import styles from '@/components/server/console/style.module.css';

interface ChartBlockProps {
    title: string;
    /** Nama ligature Material Symbols di kiri judul (brief-1). */
    icon?: string;
    legend?: React.ReactNode;
    children: React.ReactNode;
}

export default ({ title, icon, legend, children }: ChartBlockProps) => (
    <div className={classNames(styles.chart_container, 'group')}>
        <div className={'flex items-center justify-between px-4 py-3 border-b border-muted'}>
            <div className={'flex items-center gap-2 min-w-0'}>
                {icon && <MaterialIcon name={icon} size={20} className={'text-brand flex-shrink-0'} />}
                <h3 className={'font-label-md text-label-md text-text-primary font-semibold truncate transition-colors duration-150'}>
                    {title}
                </h3>
            </div>
            {legend && <p className={'font-label-sm text-label-sm flex items-center text-text-secondary'}>{legend}</p>}
        </div>
        <div className={'z-10 p-2 ml-1'}>{children}</div>
    </div>
);
