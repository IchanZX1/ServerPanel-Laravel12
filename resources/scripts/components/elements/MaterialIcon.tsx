import React from 'react';

type Props = Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> & {
    /** Nama ligature Material Symbols, mis. 'shopping_cart' atau 'memory_alt'. */
    name: string;
    /** Ukuran dalam px. Default 20 (ukuran ikon di keempat brief). */
    size?: number;
    /**
     * Ikon dekoratif — default true, dan itu benar untuk hampir semua kasus di
     * brief karena ikon selalu berpasangan dengan label teks di sebelahnya.
     * Set `false` hanya bila ikon berdiri sendiri (mis. tombol ikon tanpa teks);
     * saat itu pemanggil WAJIB memberi `aria-label`, kalau tidak tombolnya
     * kehilangan nama yang bisa dibaca screen reader.
     */
    decorative?: boolean;
};

/**
 * Ikon Material Symbols Outlined.
 *
 * Kelas `.material-symbols-outlined` (dengan ligature 'liga') didefinisikan di
 * GlobalStylesheet.ts — bukan di sini, karena rule-nya harus ada sebelum font
 * dipakai dan hanya boleh ditulis sekali.
 *
 * Tidak ada prop `filled`: font yang di-bundle adalah bobot statis 400 tanpa
 * sumbu FILL, jadi `font-variation-settings: 'FILL' 1` tidak akan berpengaruh.
 * Kalau nanti butuh ikon terisi, ganti ke paket `-variable` dulu.
 */
const MaterialIcon = ({ name, size = 20, decorative = true, style, ...rest }: Props) => (
    <span
        {...rest}
        aria-hidden={decorative ? 'true' : undefined}
        className={['material-symbols-outlined', rest.className].filter(Boolean).join(' ')}
        style={{ fontSize: size, ...style }}
    >
        {name}
    </span>
);

export default MaterialIcon;
