import React from 'react';
import Icon from '@/components/elements/Icon';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames';
import styles from './style.module.css';
import useFitText from 'use-fit-text';
import CopyOnClick from '@/components/elements/CopyOnClick';

interface StatBlockProps {
    title: string;
    copyOnClick?: string;
    color?: string | undefined;
    icon: IconDefinition;
    children: React.ReactNode;
    className?: string;
}

export default ({ title, copyOnClick, icon, color, className, children }: StatBlockProps) => {
    const { fontSize, ref } = useFitText({ minFontSize: 8, maxFontSize: 500 });

    return (
        <CopyOnClick text={copyOnClick}>
            <div className={classNames(styles.stat_block, className)}>
                <div className={classNames(styles.status_bar, color || 'bg-cyan-500/80')} />
                <div className={classNames(styles.icon, color || 'bg-neutral-800/80 border border-neutral-700/50')}>
                    <Icon
                        icon={icon}
                        className={classNames({
                            'text-neutral-200': !color,
                            'text-neutral-50': color,
                        })}
                    />
                </div>
                <div className={'flex flex-col justify-center overflow-hidden w-full'}>
                    <p className={'font-sans font-medium text-xs tracking-wider uppercase text-neutral-400'}>{title}</p>
                    <div
                        ref={ref}
                        className={'h-[1.75rem] w-full font-sans font-semibold text-neutral-100 truncate mt-0.5'}
                        style={{ fontSize }}
                    >
                        {children}
                    </div>
                </div>
            </div>
        </CopyOnClick>
    );
};
