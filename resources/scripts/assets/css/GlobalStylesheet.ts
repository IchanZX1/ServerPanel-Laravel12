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
     * brief-5 — token warna & mode terang.
     *
     * Token Tailwind (surface-*, text-*, border-*, neutral-*) dikompilasi jadi
     * 'rgb(var(--app-*))' tanpa fallback — lihat catatan tone() di
     * tailwind.config.js soal kenapa fallback dan 'alpha-value' tidak bisa
     * dipakai. Karena itu NILAI GELAPNYA WAJIB ada di sini; kalau blok ini
     * hilang, setiap warna token jadi tidak terisi dan panel tampak transparan.
     *
     * Kelas light dipasang di elemen <html> oleh AppShell.tsx, dan SEKALI LAGI
     * oleh skrip inline di wrapper.blade.php supaya tema yang dipilih tidak
     * berkedip gelap saat halaman dimuat ulang.
     *
     * Ditulis sebagai selector utuh (html.light), bukan bersarang
     * (html { &.light { ... } }): styled-components TIDAK meratakan tanda &
     * di dalam createGlobalStyle, sehingga bentuk bersarang ikut terkirim apa
     * adanya sebagai "html{&.light{...}" dan seluruh aturan itu diabaikan
     * peramban — inilah yang dulu membuat tombol tema terlihat tidak bekerja.
     *
     * color-scheme memberitahu peramban widget bawaan (dropdown select,
     * date/time picker, autofill, scrollbar) mengikuti tema aktif. Tanpa ini
     * select di mode terang membuka popup gelap khas Chrome.
     */
    :root {
        color-scheme: dark;

        /* Permukaan — nilai mode gelap (nilai lama, pertahankan). */
        --app-surface-base: 9 9 11;
        --app-surface-muted: 19 19 22;
        --app-surface-dim: 19 19 22;
        --app-surface-strong: 23 23 27;
        --app-surface-card: 20 20 24;
        --app-surface-header: 28 28 34;
        --app-surface-hover: 34 34 42;
        --app-surface-active: 42 42 53;
        --app-surface-container-lowest: 14 14 17;
        --app-surface-container-low: 27 27 30;
        --app-surface-container: 31 31 34;
        --app-surface-container-high: 42 42 45;
        --app-surface-container-highest: 53 52 56;

        /* Teks. */
        --app-text-primary: 250 250 250;
        --app-text-secondary: 161 161 170;
        --app-text-tertiary: 228 228 231;
        --app-text-muted: 113 113 122;

        --app-on-surface: 228 225 230;
        --app-on-surface-variant: 188 201 205;

        /* Border. */
        --app-border-default: 63 63 70;
        --app-border-muted: 41 41 47;
        --app-border-strong: 63 63 70;

        /*
         * Ramp netral panel (dipakai di banyak layar selain keempat brief).
         * Nilai kanalnya sama dengan hsl() lama — 900 = hsl(210, 24%, 16%).
         */
        --app-neutral-50: 245 247 250;
        --app-neutral-100: 229 232 235;
        --app-neutral-200: 202 209 216;
        --app-neutral-300: 154 165 177;
        --app-neutral-400: 123 135 147;
        --app-neutral-500: 96 109 123;
        --app-neutral-600: 81 95 108;
        --app-neutral-700: 63 77 90;
        --app-neutral-800: 51 64 77;
        --app-neutral-900: 20 41 62;
    }

    html.light {
        color-scheme: light;

        --app-surface-base: 244 244 245;
        --app-surface-muted: 244 244 245;
        --app-surface-dim: 244 244 245;
        --app-surface-strong: 255 255 255;
        --app-surface-card: 255 255 255;
        --app-surface-header: 255 255 255;
        --app-surface-hover: 244 244 245;
        --app-surface-active: 228 228 231;
        --app-surface-container-lowest: 250 250 250;
        --app-surface-container-low: 244 244 245;
        --app-surface-container: 244 244 245;
        --app-surface-container-high: 228 228 231;
        --app-surface-container-highest: 212 212 216;

        --app-text-primary: 9 9 11;
        --app-text-secondary: 82 82 91;
        --app-text-tertiary: 24 24 27;
        --app-text-muted: 113 113 122;

        --app-on-surface: 9 9 11;
        --app-on-surface-variant: 82 82 91;

        --app-border-default: 212 212 216;
        --app-border-muted: 228 228 231;
        --app-border-strong: 161 161 170;

        /*
         * Ramp netral lama (dipakai layar di luar keempat brief). Langkahnya
         * ditukar ujung-ke-ujung — 900 jadi paling terang dan 50 jadi paling
         * gelap — supaya latar netral-900 berhenti jadi kotak hitam dan
         * teks netral-100 berhenti jadi putih. Dua langkah tengah (400/500)
         * sengaja dibiarkan: kontrasnya sudah cukup di dua tema.
         */
        --app-neutral-50: 20 41 62;
        --app-neutral-100: 51 64 77;
        --app-neutral-200: 63 77 90;
        --app-neutral-300: 81 95 108;
        --app-neutral-600: 154 165 177;
        --app-neutral-700: 202 209 216;
        --app-neutral-800: 229 232 235;
        --app-neutral-900: 245 247 250;
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
        background-color: rgb(var(--app-surface-base, 9 9 11)) !important;
        color: rgb(var(--app-text-primary, 250 250 250));
        letter-spacing: 0.015em;
        font-family: 'Outfit', system-ui, sans-serif;
        /*
         * Transisi lembut saat tombol tema brief-5 ditekan. Tanpa ini pergantian
         * terang/gelap terasa seperti kedipan keras. Sengaja hanya warna latar
         * dan teks — properti lain (transform, dst.) tidak ikut teranimasi.
         */
        transition: background-color 200ms ease, color 200ms ease;
    }

    /*
     * Widget bawaan peramban membaca color-scheme dari body, bukan html —
     * itu sebabnya blok terpisah ini diperlukan meski :root/html sudah benar.
     */
    body {
        color-scheme: dark;
    }

    html.light body {
        color-scheme: light;
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
