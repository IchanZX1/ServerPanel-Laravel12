import React from 'react';
import styled from 'styled-components/macro';
import tw, { theme } from 'twin.macro';

interface Props {
    /** Render sebagai daftar vertikal untuk ditempel di dalam sidebar (AppShell). */
    vertical?: boolean;
    /** Judul seksi kecil di atas daftar link (mis. 'Account', 'Server'). */
    title?: string;
}

const SubNavigation = styled.div<{ $vertical?: boolean }>`
    ${(props) => (props.$vertical ? tw`flex flex-col gap-2 mx-3 mt-6 pt-4 border-t border-neutral-800` : tw`w-full bg-neutral-700 shadow overflow-x-auto`)};

    & > .section-title {
        ${tw`px-4 text-2xs uppercase tracking-wide text-neutral-500`};
    }

    & > div {
        ${(props) => (props.$vertical ? tw`flex flex-col gap-1` : tw`flex items-center text-sm mx-auto px-2`)};
        max-width: ${(props) => (props.$vertical ? 'none' : '1200px')};

        & > a,
        & > div {
            ${(props) =>
                props.$vertical
                    ? tw`block px-4 py-2 rounded-md text-sm text-neutral-300 no-underline whitespace-nowrap transition-colors duration-150`
                    : tw`inline-block py-3 px-4 text-neutral-300 no-underline whitespace-nowrap transition-all duration-150`};

            &:hover {
                ${(props) => (props.$vertical ? tw`text-neutral-100 bg-neutral-800` : tw`text-neutral-100`)};
            }

            &:focus-visible {
                ${tw`outline-none ring-2 ring-cyan-400`};
            }

            &:active,
            &.active {
                ${(props) => (props.$vertical ? tw`text-neutral-100 bg-black` : tw`text-neutral-100`)};

                box-shadow: inset ${(props) => (props.$vertical ? '2px 0' : '0 -2px')}
                    ${theme`colors.cyan.600`.toString()};
            }
        }
    }
`;

const SubNavigationBase: React.FC<Props> = ({ vertical, title, children }) => (
    <SubNavigation $vertical={vertical}>
        {vertical && title && <span className={'section-title'}>{title}</span>}
        <div>{children}</div>
    </SubNavigation>
);

export default SubNavigationBase;
