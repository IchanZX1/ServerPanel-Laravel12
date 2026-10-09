import React from 'react';
import classNames from 'classnames';
import MaterialIcon from '@/components/elements/MaterialIcon';

interface AlertProps {
    type: 'warning' | 'danger';
    className?: string;
    children: React.ReactNode;
}

export default ({ type, className, children }: AlertProps) => {
    return (
        <div
            className={classNames(
                'flex items-center border-l-8 text-text-primary rounded-md shadow px-4 py-3',
                {
                    ['border-danger bg-danger/25']: type === 'danger',
                    ['border-warning bg-warning/25']: type === 'warning',
                },
                className
            )}
        >
            <MaterialIcon
                name={type === 'danger' ? 'shield' : 'warning'}
                size={24}
                className={classNames('mr-2 flex-shrink-0', type === 'danger' ? 'text-danger' : 'text-warning')}
            />
            {children}
        </div>
    );
};
