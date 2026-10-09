import tw from 'twin.macro';
import { createGlobalStyle } from 'styled-components/macro';
// @ts-expect-error untyped font file
import font from '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2';
// DESIGN.md — font.family.primary=Outfit (adopsi sebagian; palet panel tetap)
// @ts-expect-error untyped font file
import outfit from '@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2';
// PRD — JetBrains Mono untuk terminal & metrik telemetri.
// @ts-expect-error untyped font file
import jetbrainsMono from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2';
// DESIGN.md — Material Symbols Outlined, satu-satunya ikon di keempat brief.
// Bobot statis 400 (bukan paket variable): brief tidak memakai sumbu wght/FILL
// sama sekali, dan latin-400 hanya 323 KB sedangkan latin-wght variable 757 KB.
// @ts-expect-error untyped font file
import materialSymbols from '@fontsource/material-symbols-outlined/files/material-symbols-outlined-latin-400-normal.woff2';

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
     * PRD — JetBrains Mono (Terminal & Telemetri).
     * Rentang bobot variable-nya 100–800, bukan 100–900 seperti Outfit.
     * Tanpa @font-face ini, utility font-mono dan th('fontFamily.mono') akan
     * jatuh ke stack monospace sistem dan brief tidak terpenuhi.
     */
    @font-face {
        font-family: 'JetBrains Mono';
        font-style: normal;
        font-display: swap;
        font-weight: 100 800;
        src: url(${jetbrainsMono}) format('woff2-variations');
        unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
    }

    /*
     * DESIGN.md — Material Symbols Outlined.
     * Bobot statis 400 karena keempat brief hanya memakai kelas
     * material-symbols-outlined polos, tanpa sumbu wght/FILL.
     */
    @font-face {
        font-family: 'Material Symbols Outlined';
        font-style: normal;
        font-display: swap;
        font-weight: 400;
        src: url(${materialSymbols}) format('woff2');
        unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
    }

    /*
     * Rule ligature Material Symbols.
     *
     * WAJIB ditulis sendiri: CSS bawaan @fontsource/material-symbols-outlined
     * hanya berisi @font-face, tanpa rule class. Tanpa font-feature-settings
     * 'liga' di sini, nama ikon dirender sebagai TEKS BIASA ("shopping_cart"),
     * bukan glyph — jadi jangan dihapus meski terlihat berlebihan.
     */
    .material-symbols-outlined {
        font-family: 'Material Symbols Outlined';
        font-weight: normal;
        font-style: normal;
        font-size: 24px;
        line-height: 1;
        letter-spacing: normal;
        text-transform: none;
        display: inline-block;
        white-space: nowrap;
        word-wrap: normal;
        direction: ltr;
        font-feature-settings: 'liga';
        -webkit-font-feature-settings: 'liga';
        -webkit-font-smoothing: antialiased;
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

    @keyframes grid-spotlight-drift {
        0% { transform: translate3d(-12%, -8%, 0) scale(1); opacity: 0.55; }
        50% { transform: translate3d(10%, 6%, 0) scale(1.15); opacity: 0.85; }
        100% { transform: translate3d(-12%, -8%, 0) scale(1); opacity: 0.55; }
    }

    /*
     * Layer spotlight. Grid digambar canvas (AnimatedGridBackground) supaya
     * partikel bisa "hidup" di sel grid yang sama — CSS saja tidak bisa itu.

     z-index: -1 supaya berada di atas background body tapi di bawah
     SEMUA konten in-flow (urutan paint: background → descendant negatif →
     background block in-flow → inline content). Pola sama dengan
     .particles-js-canvas-el di themes/pterodactyl/css. Jangan naikkan ke 0 —
     grid akan menimpa teks.

     Layer dibuat oversized (inset negatif) dan dianimasikan lewat transform,
     bukan background-position: animasi transform cuma compositing, sedangkan
     background-position memicu repaint satu viewport tiap frame.
     */
    body::after {
        content: '';
        position: fixed;
        inset: -20%;
        z-index: -1;
        pointer-events: none;
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
