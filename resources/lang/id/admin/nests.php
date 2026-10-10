<?php

return [
    'notices' => [
        'created' => 'Nest baru, :name, berhasil dibuat.',
        'deleted' => 'Nest yang diminta berhasil dihapus dari Panel.',
        'updated' => 'Opsi konfigurasi nest berhasil diperbarui.',
    ],
    'eggs' => [
        'notices' => [
            'imported' => 'Egg ini beserta variabelnya berhasil diimpor.',
            'updated_via_import' => 'Egg ini telah diperbarui menggunakan berkas yang diberikan.',
            'deleted' => 'Egg yang diminta berhasil dihapus dari Panel.',
            'updated' => 'Konfigurasi Egg berhasil diperbarui.',
            'script_updated' => 'Skrip instalasi Egg telah diperbarui dan akan dijalankan setiap kali server diinstal.',
            'egg_created' => 'Egg baru berhasil dibuat. Anda perlu memulai ulang daemon yang sedang berjalan untuk menerapkan egg baru ini.',
        ],
    ],
    'variables' => [
        'notices' => [
            'variable_deleted' => 'Variabel ":variable" telah dihapus dan tidak akan lagi tersedia untuk server setelah dibangun ulang.',
            'variable_updated' => 'Variabel ":variable" telah diperbarui. Anda perlu membangun ulang server yang menggunakan variabel ini agar perubahan diterapkan.',
            'variable_created' => 'Variabel baru berhasil dibuat dan ditetapkan ke egg ini.',
        ],
    ],
];
