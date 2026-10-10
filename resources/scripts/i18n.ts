import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import I18NextHttpBackend, { HttpBackendOptions } from 'i18next-http-backend';
import I18NextMultiloadBackendAdapter from 'i18next-multiload-backend-adapter';
import { getStoredLanguage } from '@/appearance';

// If we're using HMR use a unique hash per page reload so that we're always
// doing cache busting. Otherwise just use the builder provided hash value in
// the URL to allow cache busting to occur whenever the front-end is rebuilt.
const hash = module.hot ? Date.now().toString(16) : process.env.WEBPACK_BUILD_HASH;

/*
 * brief-5 — bahasa awal.
 *
 * Sebelumnya selalu 'en', jadi pilihan pengguna dari tombol bahasa di sidebar
 * hilang tiap kali halaman dimuat ulang. Sekarang pilihan tersimpan
 * (localStorage) dipakai lebih dulu; bootstrap akun di App.tsx bisa
 * menimpanya dengan bahasa yang tersimpan di server.
 *
 * `initImmediate: false` membuat init() selesai sinkron, sehingga
 * changeLanguage() dari App.tsx aman dipanggil langsung setelah impor ini —
 * tanpa itu pemanggilan bisa balapan dengan inisialisasi backend.
 */
i18n.use(I18NextMultiloadBackendAdapter)
    .use(initReactI18next)
    .init({
        debug: process.env.DEBUG === 'true',
        lng: getStoredLanguage() || 'en',
        fallbackLng: 'en',
        initImmediate: false,
        keySeparator: '.',
        backend: {
            backend: I18NextHttpBackend,
            backendOption: {
                loadPath: '/locales/locale.json?locale={{lng}}&namespace={{ns}}',
                queryStringParams: { hash },
                allowMultiLoading: true,
            } as HttpBackendOptions,
        } as Record<string, any>,
        interpolation: {
            // Per i18n-react documentation: this is not needed since React is already
            // handling escapes for us.
            escapeValue: false,
        },
    });

export default i18n;
