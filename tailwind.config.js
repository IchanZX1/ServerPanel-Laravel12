const colors = require('tailwindcss/colors');

/*
 * Warna yang bisa berpindah tema.
 *
 * Bentuknya `rgb(var(--nama))` — TANPA fallback dan TANPA `<alpha-value>`.
 * Dua hal itu masing-masing mematahkan satu kompiler:
 *
 *  - Fallback (`var(--x, 20 41 62)`) berisi spasi, dan regex `parseColor`
 *    Tailwind menolak spasi di dalam var() — akibatnya kelas ber-alpha
 *    seperti `hover:bg-neutral-800/60` dianggap tidak ada dan `@apply`
 *    gagal keras saat build.
 *  - `<alpha-value>` tidak diganti oleh twin.macro (hanya Tailwind yang
 *    menggantinya saat mengompilasi kelas). twin menuliskan placeholder itu
 *    mentah ke CSS-in-JS, seluruh deklarasi warnanya jadi tidak valid dan
 *    DIBUANG peramban — inilah penyebab bug "semua border transparan".
 *
 * Nilai gelapnya pindah ke blok `:root` di GlobalStylesheet.ts, dan
 * `html.light` menimpanya untuk mode terang. Tanpa var() yang terisi,
 * warnanya jatuh ke `initial` — karena itu kedua blok itu wajib ada.
 */
const tone = (name) => `rgb(var(${name}))`;

/*
 * Ramp netral panel. Nilai kanalnya ada di `:root` GlobalStylesheet.ts —
 * yang di sini hanya nama variabelnya. Nilai gelap sama dengan hsl() lama
 * (hsl(210, 24%, 16%) = 20 41 62).
 */
const neutral = {
    50: tone('--app-neutral-50'),
    100: tone('--app-neutral-100'),
    200: tone('--app-neutral-200'),
    300: tone('--app-neutral-300'),
    400: tone('--app-neutral-400'),
    500: tone('--app-neutral-500'),
    600: tone('--app-neutral-600'),
    700: tone('--app-neutral-700'),
    800: tone('--app-neutral-800'),
    900: tone('--app-neutral-900'),
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
                'on-surface': tone('--app-on-surface'),
                'on-surface-variant': tone('--app-on-surface-variant'),
                error: '#ffb4ab',

                /*
                 * Permukaan. `surface-base` = background halaman, `-card` = kartu,
                 * `-header` = bar header/modal, `container-*` = blok bersarang.
                 *
                 * Bentuk penuh `rgb(var(--app-surface-base) / <alpha-value>)` sengaja
                 * dipakai di sini. Itu membuat warna ini kompatibel dengan
                 * modifier alpha Tailwind (`bg-surface-card/60`), dan
                 * `<alpha-value>` tetap aman karena token permukaan hanya
                 * dipakai lewat utility class / `@apply` — TIDAK lewat `tw\`\``.
                 * Token `neutral-*` di atas justru wajib tanpa placeholder itu
                 * karena twin.macro menyalinnya mentah ke CSS-in-JS.
                 */
                surface: {
                    base: tone('--app-surface-base'),
                    muted: tone('--app-surface-muted'),
                    dim: tone('--app-surface-dim'),
                    strong: tone('--app-surface-strong'),
                    card: tone('--app-surface-card'),
                    header: tone('--app-surface-header'),
                    hover: tone('--app-surface-hover'),
                    active: tone('--app-surface-active'),
                    'container-lowest': tone('--app-surface-container-lowest'),
                    'container-low': tone('--app-surface-container-low'),
                    container: tone('--app-surface-container'),
                    'container-high': tone('--app-surface-container-high'),
                    'container-highest': tone('--app-surface-container-highest'),
                },

                // Teks. Dipakai sebagai `text-text-primary` — brief menamai
                // token-nya `text-primary`, tapi nama itu bertabrakan dengan
                // warna `primary` (ramp blue) di atas. Sama seperti permukaan,
                // nilainya bisa ditimpa mode terang.
                text: {
                    primary: tone('--app-text-primary'),
                    secondary: tone('--app-text-secondary'),
                    tertiary: tone('--app-text-tertiary'),
                    muted: tone('--app-text-muted'),
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
                    DEFAULT: tone('--app-border-default'),
                    muted: tone('--app-border-muted'),
                    strong: tone('--app-border-strong'),
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
                /*
                 * Hex konkret (123 135 147 = neutral-400 gelap).
                 *
                 * Token-token di atas adalah string `rgb(var(--app-*))` berisi
                 * var() — BUKAN nilai warna yang bisa diurai. Pengalaman
                 * sebelumnya: memanggil theme('colors.neutral.400') di sini
                 * menuliskan var() mentah ke preflight Tailwind
                 * (`*, ::before, ::after { border-color: ... }`) sehingga seluruh
                 * border jatuh transparan. Jangan panggil theme() di sini.
                 */
                default: '#7b8793',
                // DESIGN.md — border.muted/strong. `border-strong` dipakai brief
                // untuk tepi yang lebih tegas, `border-muted` untuk pemisah halus.
                // Lewat var() juga, supaya garis pemisah ikut berubah di mode terang.
                muted: tone('--app-border-muted'),
                strong: tone('--app-border-strong'),
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
