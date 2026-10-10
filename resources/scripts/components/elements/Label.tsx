import styled from 'styled-components/macro';
import tw from 'twin.macro';

const Label = styled.label<{ isLight?: boolean }>`
    ${tw`block text-xs font-medium uppercase tracking-wider text-text-secondary mb-1.5`};
    /*
     * Varian isLight dipakai form autentikasi yang latarnya memang terang
     * permanen (login/reset). Warna di bawah aman di kedua tema karena
     * netral-700 kini ikut dibalik oleh html.light.
     */
    ${(props) => props.isLight && tw`text-neutral-700`};
`;

export default Label;
