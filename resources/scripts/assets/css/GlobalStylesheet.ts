import tw from 'twin.macro';
import { createGlobalStyle } from 'styled-components/macro';
// @ts-expect-error untyped font file
import font from '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2';
// DESIGN.md — font.family.primary=Outfit (adopsi sebagian; palet panel tetap)
// @ts-expect-error untyped font file
import outfit from '@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2';

export default createGlobalStyle`
    @font-face {
        font-family: 'IBM Plex Sans';
        font-style: normal;
        font-display: swap;
        font-weight: 100 700;
        src: url(${font}) format('woff2-variations');
        unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
    }

    @font-face {
        font-family: 'Outfit';
        font-style: normal;
        font-display: swap;
        font-weight: 100 900;
        src: url(${outfit}) format('woff2-variations');
        unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
    }

    /*
     * Animated Grid Background — token.
     *
     * Warna garis dan cyan dipakai eksplisit, bukan token --z0ne-*: palet itu
     * tidak punya varian "garis halus" maupun nilai cyan, dan custom property
     * tidak bisa diturunkan alpha-nya tanpa memisah channel RGB. Nilai cyan
     * sama dengan --z0ne-info (#06b6d4) di themes/pterodactyl/css.
     */
    :root {
        --grid-cell: 3rem;
        --grid-line: rgba(255, 255, 255, 0.05);
        --grid-glow: 6, 182, 212;
        --grid-glow-opacity: 0.35;
        --grid-drift: 24s;
    }

    @keyframes grid-drift {
        from { transform: translate3d(0, 0, 0); }
        to { transform: translate3d(var(--grid-cell), var(--grid-cell), 0); }
    }

    @keyframes grid-spotlight-drift {
        0% { transform: translate3d(-12%, -8%, 0) scale(1); opacity: 0.55; }
        50% { transform: translate3d(10%, 6%, 0) scale(1.15); opacity: 0.85; }
        100% { transform: translate3d(-12%, -8%, 0) scale(1); opacity: 0.55; }
    }

    /*
     * Layer grid + spotlight.

     Keduanya z-index: -1 supaya berada di atas background body tapi di bawah
     SEMUA konten in-flow (urutan paint: background → descendant negatif →
     background block in-flow → inline content). Pola sama dengan
     .particles-js-canvas-el di themes/pterodactyl/css. Jangan naikkan ke 0 —
     grid akan menimpa teks.

     Layer dibuat oversized (inset negatif) dan dianimasikan lewat transform,
     bukan background-position: animasi transform cuma compositing, sedangkan
     background-position memicu repaint satu viewport tiap frame.
     */
    body::before,
    body::after {
        content: '';
        position: fixed;
        inset: -20%;
        z-index: -1;
        pointer-events: none;
    }

    body::before {
        background-image:
            repeating-linear-gradient(to right, var(--grid-line) 0 1px, transparent 1px 100%),
            repeating-linear-gradient(to bottom, var(--grid-line) 0 1px, transparent 1px 100%);
        background-size: var(--grid-cell) var(--grid-cell);
        /* Grid memudar ke bawah supaya tidak bertabrakan dengan konten panjang. */
        mask-image: linear-gradient(to bottom, #000 0%, transparent 100%);
        -webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 100%);
        animation: grid-drift var(--grid-drift) linear infinite;
        will-change: transform;
    }

    body::after {
        background-image: radial-gradient(
            circle at 50% 50%,
            rgba(var(--grid-glow), var(--grid-glow-opacity)) 0%,
            transparent 60%
        );
        animation: grid-spotlight-drift calc(var(--grid-drift) * 1.75) ease-in-out infinite;
        will-change: transform, opacity;
    }

    @media (max-width: 640px) {
        :root {
            --grid-cell: 2rem;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        body::before,
        body::after {
            animation: none;
        }
    }

    body {
        background-color: var(--z0ne-surface-base, #09090b) !important;
        color: var(--z0ne-text-primary, #fafafa);
        letter-spacing: 0.015em;
        font-family: 'Outfit', system-ui, sans-serif;
    }

    h1, h2, h3, h4, h5, h6 {
        ${tw`font-medium tracking-normal font-sans`};
    }

    p {
        ${tw`text-neutral-200 leading-snug font-sans`};
    }

    form {
        ${tw`m-0`};
    }

    textarea, select, input, button, button:focus, button:focus-visible {
        ${tw`outline-none`};
    }

    input[type=number]::-webkit-outer-spin-button,
    input[type=number]::-webkit-inner-spin-button {
        -webkit-appearance: none !important;
        margin: 0;
    }

    input[type=number] {
        -moz-appearance: textfield !important;
    }

    /* Scroll Bar Style */
    ::-webkit-scrollbar {
        background: none;
        width: 16px;
        height: 16px;
    }

    ::-webkit-scrollbar-thumb {
        border: solid 0 rgb(0 0 0 / 0%);
        border-right-width: 4px;
        border-left-width: 4px;
        -webkit-border-radius: 9px 4px;
        -webkit-box-shadow: inset 0 0 0 1px hsl(211, 10%, 53%), inset 0 0 0 4px hsl(209deg 18% 30%);
    }

    ::-webkit-scrollbar-track-piece {
        margin: 4px 0;
    }

    ::-webkit-scrollbar-thumb:horizontal {
        border-right-width: 0;
        border-left-width: 0;
        border-top-width: 4px;
        border-bottom-width: 4px;
        -webkit-border-radius: 4px 9px;
    }

    ::-webkit-scrollbar-corner {
        background: transparent;
    }
`;
