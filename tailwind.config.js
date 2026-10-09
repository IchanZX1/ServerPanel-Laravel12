const colors = require('tailwindcss/colors');

const gray = {
    50: 'hsl(216, 33%, 97%)',
    100: 'hsl(214, 15%, 91%)',
    200: 'hsl(210, 16%, 82%)',
    300: 'hsl(211, 13%, 65%)',
    400: 'hsl(211, 10%, 53%)',
    500: 'hsl(211, 12%, 43%)',
    600: 'hsl(209, 14%, 37%)',
    700: 'hsl(209, 18%, 30%)',
    800: 'hsl(209, 20%, 25%)',
    900: 'hsl(210, 24%, 16%)',
};

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
                'on-surface': '#e4e1e6',
                'on-surface-variant': '#bcc9cd',
                error: '#ffb4ab',

                // Permukaan. `surface-base` = background halaman, `-card` = kartu,
                // `-header` = bar header/modal, `container-*` = blok bersarang.
                surface: {
                    base: '#09090b',
                    muted: '#131316',
                    dim: '#131316',
                    strong: '#17171b',
                    card: '#141418',
                    header: '#1c1c22',
                    hover: '#22222a',
                    active: '#2a2a35',
                    'container-lowest': '#0e0e11',
                    'container-low': '#1b1b1e',
                    container: '#1f1f22',
                    'container-high': '#2a2a2d',
                    'container-highest': '#353438',
                },

                // Teks. Dipakai sebagai `text-text-primary` — brief menamai
                // token-nya `text-primary`, tapi nama itu bertabrakan dengan
                // warna `primary` (ramp blue) di atas.
                text: {
                    primary: '#fafafa',
                    secondary: '#a1a1aa',
                    tertiary: '#e4e4e7',
                    muted: '#71717a',
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
                    DEFAULT: '#3f3f46',
                    muted: '#29292f',
                    strong: '#3f3f46',
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
                muted: '#29292f',
                strong: '#3f3f46',
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
