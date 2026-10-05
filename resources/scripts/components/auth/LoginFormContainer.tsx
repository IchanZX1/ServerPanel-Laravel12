import React, { forwardRef } from 'react';
import { Form } from 'formik';
import styled from 'styled-components/macro';
import { breakpoint } from '@/theme';
import FlashMessageRender from '@/components/FlashMessageRender';
import tw from 'twin.macro';
// Aset di-import lewat webpack (svg-url-loader) — bukan path /assets/svgs/ yang tidak ada.
import logo from '@/assets/images/pterodactyl.svg';

type Props = React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement> & {
    title?: string;
};

const Container = styled.div`
    ${breakpoint('sm')`
        ${tw`w-4/5 mx-auto`}
    `};

    ${breakpoint('md')`
        ${tw`p-6`}
    `};

    ${breakpoint('lg')`
        ${tw`w-4/5`}
    `};

    ${breakpoint('xl')`
        ${tw`w-full`}
        max-width: 850px;
    `};
`;

export default forwardRef<HTMLFormElement, Props>(({ title, ...props }, ref) => (
    <Container>
        {title && (
            <h2
                style={{ color: 'var(--z0ne-text-primary, #fafafa)' }}
                css={tw`text-xl md:text-2xl text-center font-semibold pb-4`}
            >
                {title}
            </h2>
        )}
        <FlashMessageRender css={tw`mb-3 px-1`} />
        <Form {...props} ref={ref}>
            <div
                style={{
                    backgroundColor: 'var(--z0ne-surface-card, #141418)',
                    borderColor: 'var(--z0ne-border-default, #27272a)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    boxShadow: 'var(--z0ne-shadow-md)',
                }}
                css={tw`flex flex-col md:flex-row w-full rounded-lg overflow-hidden shadow-ds-1`}
            >
                {/* Left Side: Artwork (decorative) */}
                <div
                    aria-hidden={'true'}
                    css={tw`hidden md:block md:w-1/2 relative bg-cover bg-center overflow-hidden min-h-[420px]`}
                >
                    <img
                        src={'https://i.pinimg.com/736x/e6/b0/30/e6b03079c3a6c5fc4cda74086e40ef2d.jpg'}
                        alt={''}
                        loading={'lazy'}
                        referrerPolicy={'no-referrer'}
                        css={tw`w-full h-full object-cover block`}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                    />
                    <div
                        style={{
                            background:
                                'linear-gradient(to top, rgba(9, 9, 11, 0.92) 0%, rgba(9, 9, 11, 0.3) 60%, transparent 100%)',
                        }}
                        css={tw`absolute inset-0 flex flex-col justify-end p-6 z-10`}
                    >
                        <div css={tw`flex items-center gap-2 mb-2`}>
                            <img src={logo} alt={''} aria-hidden={'true'} css={tw`w-8 h-8 block`} />
                            <span
                                style={{ color: 'var(--z0ne-text-primary, #fafafa)' }}
                                css={tw`font-semibold text-sm tracking-wide`}
                            >
                                ServerPanel
                            </span>
                        </div>
                        <h3 style={{ color: 'var(--z0ne-text-primary, #fafafa)' }} css={tw`font-bold text-lg mb-1`}>
                            Next-Gen Server Control
                        </h3>
                        <p style={{ color: 'var(--z0ne-text-secondary, #a1a1aa)' }} css={tw`text-xs leading-relaxed`}>
                            High-speed cloud management, maximum security, and low latency server deployments.
                        </p>
                    </div>
                </div>

                {/* Right Side: Form Container */}
                <div css={tw`w-full md:w-1/2 p-5 md:p-7 flex flex-col justify-center`}>
                    <div css={tw`md:hidden mb-4 text-center`}>
                        <img src={logo} alt={''} aria-hidden={'true'} css={tw`block w-24 mx-auto mb-2`} />
                    </div>
                    {props.children}
                </div>
            </div>
        </Form>
        <p
            style={{ color: 'var(--z0ne-text-secondary, #a1a1aa)' }}
            css={tw`text-center text-xs mt-4 break-words`}
        >
            &copy; {new Date().getFullYear()} ServerPanel
        </p>
    </Container>
));
