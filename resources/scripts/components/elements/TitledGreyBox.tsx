import React, { memo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import tw from 'twin.macro';
import isEqual from 'react-fast-compare';

interface Props {
    icon?: IconProp;
    title: string | React.ReactNode;
    className?: string;
    children: React.ReactNode;
}

const TitledGreyBox = ({ icon, title, children, className }: Props) => (
    <div css={tw`rounded-xl shadow-lg bg-neutral-900 border border-neutral-800 overflow-hidden backdrop-blur-sm`} className={className}>
        <div css={tw`bg-neutral-900 p-3.5 border-b border-neutral-800`}>
            {typeof title === 'string' ? (
                <p css={tw`text-xs font-semibold uppercase tracking-wider text-neutral-300`}>
                    {icon && <FontAwesomeIcon icon={icon} css={tw`mr-2 text-neutral-400`} />}
                    {title}
                </p>
            ) : (
                title
            )}
        </div>
        <div css={tw`p-4`}>{children}</div>
    </div>
);

export default memo(TitledGreyBox, isEqual);
