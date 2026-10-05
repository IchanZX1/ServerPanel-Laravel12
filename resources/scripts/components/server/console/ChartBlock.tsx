import React from 'react';
import classNames from 'classnames';
import styles from '@/components/server/console/style.module.css';

interface ChartBlockProps {
    title: string;
    legend?: React.ReactNode;
    children: React.ReactNode;
}

export default ({ title, legend, children }: ChartBlockProps) => (
    <div className={classNames(styles.chart_container, 'group')}>
        <div className={'flex items-center justify-between px-4 py-3 border-b border-neutral-800/80'}>
            <h3 className={'font-sans font-medium text-xs tracking-wider uppercase text-neutral-400 transition-colors duration-150 group-hover:text-neutral-200'}>
                {title}
            </h3>
            {legend && <p className={'text-xs flex items-center text-neutral-400'}>{legend}</p>}
        </div>
        <div className={'z-10 p-2 ml-1'}>{children}</div>
    </div>
);
