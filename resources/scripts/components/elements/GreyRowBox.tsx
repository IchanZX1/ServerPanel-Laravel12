import styled from 'styled-components/macro';
import tw from 'twin.macro';

export default styled.div<{ $hoverable?: boolean }>`
    ${tw`flex rounded-xl no-underline text-neutral-200 items-center bg-neutral-900 border border-neutral-800 p-4 transition-all duration-150 overflow-hidden shadow-sm`};

    ${(props) => props.$hoverable !== false && tw`hover:border-neutral-700 hover:bg-neutral-900`};

    & .icon {
        ${tw`rounded-lg w-12 h-12 flex items-center justify-center bg-neutral-800 border border-neutral-700 p-2.5 flex-shrink-0`};
    }
`;
