const colors = require('tailwindcss/colors');

/*
 * Warna yang bisa berpindah tema.
 *
 * Bentuknya `rgb(var(--nama, R G B) / <alpha-value>)`, bukan hex biasa:
 *
 *  - `var()` supaya blok `html.light` di GlobalStylesheet.ts bisa menimpanya —
 *    itulah yang membuat tombol tema brief-5 mengubah SELURUH panel, bukan
 *    cuma sidebar.
 *  - fallback `R G B` di dalam var() adalah nilai mode gelap semula, sehingga
 *    mode gelap tidak bergeser sedikit pun (dan tetap benar meski stylesheet
 *    tema belum termuat).
 *  - kanal dipisah, bukan `hsl(...)`/`#hex`, karena Tailwind hanya bisa
 *    menurunkan alpha (`bg-neutral-800/60`) kalau warnanya berupa kanal.
 *    Tanpa itu setiap kelas ber-alpha gagal dikompilasi.
 */
const tone = (name, channels) => `rgb(var(${name}, ${channels}) / <alpha-value>)`;

/*
 * Ramp netral panel. Nilai kanalnya sama dengan hsl() lama
 * (hsl(210, 24%, 16%) = 20 41 62) — cuma ditulis sebagai kanal RGB.
 */
const neutral = {
    50: tone('--app-neutral-50', '245 247 250'),
    100: tone('--app-neutral-100', '229 232 235'),
    200: tone('--app-neutral-200', '202 209 216'),
    300: tone('--app-neutral-300', '154 165 177'),
    400: tone('--app-neutral-400', '123 135 147'),
    500: tone('--app-neutral-500', '96 109 123'),
    600: tone('--app-neutral-600', '81 95 108'),
    700: tone('--app-neutral-700', '63 77 90'),
    800: tone('--app-neutral-800', '51 64 77'),
    900: tone('--app-neutral-900', '20 41 62'),
};

const gray = neutral;

module.exports = {
    content: [
        './resources/scripts/**/*.{js,ts,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                header: ['"IBM Plex Sans"', '"Roboto"', 'system-ui', 'sans-serif'],
                // DESIGN.md — font.family.primary=Outfit (adopsi sebagian, palet panel tetap)
                sans: ['Outfit', 'system-ui', 'sans-serif'],
                primary: ['Outfit', 'sans-serif'],
                // PRD — JetBrains Mono untuk terminal & metrik telemetri.
                // Dipakai lewat `font-mono` dan `th('fontFamily.mono')` di Console.tsx.
                mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
                // DESIGN.md — dua keluarga di skala tipografi brief. Dipakai lewat
                // `font-headline-*` / `font-title-md` / `font-body-*` / `font-label-*`.
                'headline-lg': ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
                'headline-lg-mobile': ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
                'headline-md': ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
                'headline-sm': ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
                'title-md': ['Outfit', 'system-ui', 'sans-serif'],
                'body-lg': ['Outfit', 'system-ui', 'sans-serif'],
                'body-md': ['Outfit', 'system-ui', 'sans-serif'],
                'body-sm': ['Outfit', 'system-ui', 'sans-serif'],
                'label-md': ['Outfit', 'system-ui', 'sans-serif'],
                'label-sm': ['Outfit', 'system-ui', 'sans-serif'],
                'label-micro': ['Outfit', 'system-ui', 'sans-serif'],
            },
            colors: {
                black: '#131a20',
                // "primary" and "neutral" are deprecated, prefer the use of "blue" and "gray"
                // in new code.
                primary: colors.blue,
                gray: gray,
                neutral: gray,
                cyan: colors.cyan,
                // PRD — Success Green (#10b981) dan Warning Yellow (#f59e0b).
                // Nilai brief itu persis emerald-500 dan amber-500, jadi ramp-nya
                // di-alias di sini alih-alih mengganti ~30 kelas green-*/yellow-*
                // di 20 file. Semua `green-*`/`yellow-*` (termasuk `@apply` di
                // style.module.css) otomatis ikut.
                green: colors.emerald,
                yellow: colors.amber,

                /*
                 * ===== Token DESIGN.md (brief-1 … brief-4) =====
                 *
                 * CATATAN soal `primary`: brief menamai aksen cyan-nya `primary`
                 * (#4cd7f6), TAPI key `primary` di config ini sudah berisi ramp
                 * colors.blue dan dipakai `bg-primary-500` dkk di Button.tsx,
                 * Input.tsx, dialog/style.module.css, dan inputs/styles.module.css.
                 * Menimpanya jadi string tunggal akan mematikan kelas-kelas itu,
                 * jadi aksen cyan brief dinamai `brand` di sini.
                 * Di JSX: `bg-brand`, `text-brand`, `border-brand`.
                 */
                brand: {
                    DEFAULT: '#4cd7f6',
                    container: '#06b6d4',
                },
                'on-primary': '#003640',
                'on-surface': tone('--app-on-surface', '228 225 230'),
                'on-surface-variant': tone('--app-on-surface-variant', '188 201 205'),
                error: '#ffb4ab',

                /*
                 * Permukaan. `surface-base` = background halaman, `-card` = kartu,
                 * `-header` = bar header/modal, `container-*` = blok bersarang.
                 *
                 * Nilainya dibungkus var() dengan fallback gelap. Alasannya:
                 * tombol tema di sidebar (brief-5) mengganti kelas `light` di
                 * <html>, dan blok `html.light` di GlobalStylesheet.ts menimpa
                 * variabel-variabel ini supaya SELURUH panel berubah — bukan
                 * cuma sidebar. Kalau variabelnya kosong (mis. stylesheet belum
                 * termuat), fallback-nya mengembalikan warna gelap semula,
                 * jadi tidak ada regresi pada mode gelap.
                 */
                surface: {
                    base: tone('--app-surface-base', '9 9 11'),
                    muted: tone('--app-surface-muted', '19 19 22'),
                    dim: tone('--app-surface-dim', '19 19 22'),
                    strong: tone('--app-surface-strong', '23 23 27'),
                    card: tone('--app-surface-card', '20 20 24'),
                    header: tone('--app-surface-header', '28 28 34'),
                    hover: tone('--app-surface-hover', '34 34 42'),
                    active: tone('--app-surface-active', '42 42 53'),
                    'container-lowest': tone('--app-surface-container-lowest', '14 14 17'),
                    'container-low': tone('--app-surface-container-low', '27 27 30'),
                    container: tone('--app-surface-container', '31 31 34'),
                    'container-high': tone('--app-surface-container-high', '42 42 45'),
                    'container-highest': tone('--app-surface-container-highest', '53 52 56'),
                },

                // Teks. Dipakai sebagai `text-text-primary` — brief menamai
                // token-nya `text-primary`, tapi nama itu bertabrakan dengan
                // warna `primary` (ramp blue) di atas. Sama seperti permukaan,
                // nilainya bisa ditimpa mode terang.
                text: {
                    primary: tone('--app-text-primary', '250 250 250'),
                    secondary: tone('--app-text-secondary', '161 161 170'),
                    tertiary: tone('--app-text-tertiary', '228 228 231'),
                    muted: tone('--app-text-muted', '113 113 122'),
                },

                // Status + varian latar transparannya.
                success: '#10b981',
                'success-bg': 'rgba(16, 185, 129, 0.12)',
                warning: '#f59e0b',
                'warning-bg': 'rgba(245, 158, 11, 0.12)',
                danger: '#ef4444',
                'danger-bg': 'rgba(239, 68, 68, 0.12)',

                /*
                 * DESIGN.md punya token border.muted/strong. Nilai border-nya
                 * sudah ada di `borderColor` (menghasilkan `border-muted` /
                 * `border-strong`), tapi untuk latar seperti garis pemisah
                 * (`bg-border-muted`) warna itu juga perlu terdaftar di sini.
                 */
                border: {
                    DEFAULT: tone('--app-border-default', '63 63 70'),
                    muted: tone('--app-border-muted', '41 41 47'),
                    strong: tone('--app-border-strong', '63 63 70'),
                },
            },
            fontSize: {
                '2xs': '0.625rem',

                /*
                 * ===== Skala tipografi DESIGN.md =====
                 * Nilai ditulis eksplisit (tailwind.config.js tidak bisa membaca
                 * DESIGN.md saat build). Format tuple Tailwind:
                 * [size, { lineHeight, letterSpacing, fontWeight }].
                 * Pasangkan dengan `font-headline-*` dkk di atas.
                 */
                'headline-lg': ['30px', { lineHeight: '38px', fontWeight: '700' }],
                'headline-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '700' }],
                'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.025em', fontWeight: '600' }],
                'headline-sm': ['20px', { lineHeight: '28px', letterSpacing: '-0.025em', fontWeight: '600' }],
                'title-md': ['18px', { lineHeight: '24px', fontWeight: '600' }],
                'body-lg': ['16px', { lineHeight: '24px', letterSpacing: '0.015em', fontWeight: '400' }],
                'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
                'body-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
                'label-md': ['14px', { lineHeight: '20px', fontWeight: '500' }],
                'label-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
                'label-micro': ['10px', { lineHeight: '14px', letterSpacing: '0.05em', fontWeight: '700' }],
            },
            // DESIGN.md — spacing. Menghasilkan `p-space-md`, `gap-space-lg`,
            // `m-space-xl`, dst. Karena `extend`, nilai lama (4, 8, 12, …) utuh.
            spacing: {
                'space-xs': '0.25rem',
                'space-sm': '0.5rem',
                'space-md': '1rem',
                'space-lg': '1.5rem',
                'space-xl': '2rem',
                gutter: '1.5rem',
                'gutter-mobile': '1rem',
                margin: '2.5rem',
                'margin-mobile': '1rem',
            },
            // DESIGN.md — radius.xs/sm/md/lg dan shadow.1
            borderRadius: {
                xs: '5px',
                sm: '6px',
                md: '8px',
                lg: '12px',
            },
            boxShadow: {
                'ds-1': 'rgba(15, 23, 42, 0.12) 0px 12px 32px -12px',
            },
            // DESIGN.md — motion.duration.instant/fast/normal
            transitionDuration: {
                150: '150ms',
                250: '250ms',
                300: '300ms',
            },
            borderColor: theme => ({
                default: theme('colors.neutral.400', 'currentColor'),
                // DESIGN.md — border.muted/strong. `border-strong` dipakai brief
                // untuk tepi yang lebih tegas, `border-muted` untuk pemisah halus.
                // Lewat var() juga, supaya garis pemisah ikut berubah di mode terang.
                muted: tone('--app-border-muted', '41 41 47'),
                strong: tone('--app-border-strong', '63 63 70'),
            }),
        },
    },
    plugins: [
        require('@tailwindcss/line-clamp'),
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
    ]
};
