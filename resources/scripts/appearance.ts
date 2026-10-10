/*
 * brief-5 — tema & bahasa.
 *
 * Satu tempat untuk dua hal yang dipakai lebih dari satu berkas:
 *
 *  - Kunci localStorage. Skrip pra-cat di `wrapper.blade.php` menyalin nilai
 *    ini ke <html> sebelum bundle React dimuat, jadi kalau salah satu kunci
 *    berubah, komentar di berkas blade itu harus ikut diperbarui.
 *  - Pemasangan kelas tema ke <html>. Blok warnanya ada di GlobalStylesheet
 *    (`html.light { … }`), bukan di sini — fungsi di bawah hanya mengganti
 *    kelasnya.
 */
export const THEME_STORAGE_KEY = 'z0ne.theme';
export const LANGUAGE_STORAGE_KEY = 'z0ne.language';

export type ThemeName = 'light' | 'dark';

/** localStorage bisa melempar di mode privat / saat cookie diblokir. */
const read = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const write = (key: string, value: string): void => {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* Penyimpanan tidak tersedia: pilihan tetap berlaku sampai tab ditutup. */
    }
};

/**
 * Tema tersimpan, atau mode gelap bila belum pernah dipilih.
 *
 * Sengaja TIDAK membaca `prefers-color-scheme` di sini: panel ini gelap secara
 * bawaan, dan skrip pra-cat di wrapper.blade.php sudah menangani kasus
 * belum-ada-pilihan dengan menghormati preferensi sistem. Setelah pengguna
 * menekan tombolnya sekali, pilihannya yang menang.
 */
export const getStoredTheme = (): ThemeName => (read(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark');

/** Pasang kelas tema ke <html> dan simpan pilihannya. */
export const applyTheme = (theme: ThemeName): void => {
    const root = document.documentElement;

    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');

    // Menyamakan warna bilah alamat peramban di ponsel dengan latar halaman.
    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'light' ? '#f4f4f5' : '#09090b');

    write(THEME_STORAGE_KEY, theme);
};

/** Bahasa tersimpan, atau null bila belum pernah dipilih. */
export const getStoredLanguage = (): string | null => read(LANGUAGE_STORAGE_KEY);

export const setStoredLanguage = (code: string): void => write(LANGUAGE_STORAGE_KEY, code);

/*
 * Dipasang SAAT MODUL DIMPORT, bukan di dalam useEffect.
 *
 * Efek React baru berjalan setelah render pertama, dan pada saat itu halaman
 * sudah sempat digambar dengan tema bawaan. Skrip pra-cat di wrapper.blade.php
 * menangani muat-awal; baris ini menangani navigasi client-side (chunk yang
 * di-load belakangan) — begitu bundle dieksekusi, kelas tema langsung benar
 * sebelum React merender apa pun.
 */
if (typeof document !== 'undefined') {
    applyTheme(getStoredTheme());
}
