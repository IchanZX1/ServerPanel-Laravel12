import React, { useMemo } from 'react';
import styled from 'styled-components/macro';
import { v4 } from 'uuid';
import tw from 'twin.macro';
import Label from '@/components/elements/Label';
import Input from '@/components/elements/Input';

const ToggleContainer = styled.div`
    ${tw`relative select-none w-12 leading-normal`};

    & > input[type='checkbox'] {
        ${tw`hidden`};

        &:checked + label {
            ${tw`bg-cyan-600 border-cyan-500 shadow-none`};
        }

        &:checked + label:before {
            right: 0.125rem;
        }
    }

    & > label {
        ${tw`mb-0 block overflow-hidden cursor-pointer bg-neutral-800 border border-neutral-700 rounded-full h-6 shadow-inner`};
        transition: all 150ms ease;

        &::before {
            ${tw`absolute block bg-neutral-100 border-0 h-5 w-5 rounded-full shadow-md`};
            top: 0.125rem;
            right: calc(50% + 0.125rem);
            content: '';
            transition: all 150ms ease-in-out;
        }
    }
`;

export interface SwitchProps {
    name: string;
    label?: string;
    description?: string;
    defaultChecked?: boolean;
    readOnly?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    children?: React.ReactNode;
}

const Switch = ({ name, label, description, defaultChecked, readOnly, onChange, children }: SwitchProps) => {
    const uuid = useMemo(() => v4(), []);

    return (
        <div css={tw`flex items-center`}>
            <ToggleContainer css={tw`flex-none`}>
                {children || (
                    <Input
                        id={uuid}
                        name={name}
                        type={'checkbox'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange && onChange(e)}
                        defaultChecked={defaultChecked}
                        disabled={readOnly}
                    />
                )}
                <Label htmlFor={uuid} />
            </ToggleContainer>
            {(label || description) && (
                <div css={tw`ml-4 w-full`}>
                    {label && (
                        <Label css={[tw`cursor-pointer`, !!description && tw`mb-0`]} htmlFor={uuid}>
                            {label}
                        </Label>
                    )}
                    {description && <p css={tw`text-neutral-400 text-sm mt-2`}>{description}</p>}
                </div>
            )}
        </div>
    );
};

export default Switch;
