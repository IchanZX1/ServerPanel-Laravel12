import styled from 'styled-components/macro';
import tw from 'twin.macro';

const Label = styled.label<{ isLight?: boolean }>`
    ${tw`block text-xs font-medium uppercase tracking-wider text-neutral-300 mb-1.5`};
    ${(props) => props.isLight && tw`text-neutral-700`};
`;

export default Label;
