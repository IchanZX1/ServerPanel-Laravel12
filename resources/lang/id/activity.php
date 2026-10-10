<?php

/**
 * Contains all of the translation strings for different activity log
 * events. These should be keyed by the value in front of the colon (:)
 * in the event name. If there is no colon present, they should live at
 * the top level.
 */
return [
    'auth' => [
        'fail' => 'Gagal masuk',
        'success' => 'Berhasil masuk',
        'password-reset' => 'Kata sandi direset',
        'reset-password' => 'Meminta reset kata sandi',
        'checkpoint' => 'Autentikasi dua faktor diminta',
        'recovery-token' => 'Menggunakan token pemulihan dua faktor',
        'token' => 'Berhasil melewati verifikasi dua faktor',
        'ip-blocked' => 'Memblokir permintaan dari alamat IP yang tidak terdaftar untuk :identifier',
        'sftp' => [
            'fail' => 'Gagal masuk SFTP',
        ],
    ],
    'user' => [
        'user' => [
            'create' => 'Membuat pengguna baru :email',
        ],
        'account' => [
            'email-changed' => 'Mengubah email dari :old menjadi :new',
            'password-changed' => 'Mengubah kata sandi',
            'language-changed' => 'Mengubah bahasa akun dari :old menjadi :new',
        ],
        'api-key' => [
            'create' => 'Membuat kunci API baru :identifier',
            'delete' => 'Menghapus kunci API :identifier',
        ],
        'ssh-key' => [
            'create' => 'Menambahkan kunci SSH :fingerprint ke akun',
            'delete' => 'Menghapus kunci SSH :fingerprint dari akun',
        ],
        'two-factor' => [
            'create' => 'Mengaktifkan autentikasi dua faktor',
            'delete' => 'Menonaktifkan autentikasi dua faktor',
        ],
    ],
    'server' => [
        'reinstall' => 'Memasang ulang server',
        'console' => [
            'command' => 'Menjalankan ":command" pada server',
        ],
        'power' => [
            'start' => 'Menyalakan server',
            'stop' => 'Mematikan server',
            'restart' => 'Memulai ulang server',
            'kill' => 'Menghentikan paksa proses server',
        ],
        'backup' => [
            'download' => 'Mengunduh cadangan :name',
            'delete' => 'Menghapus cadangan :name',
            'restore' => 'Memulihkan cadangan :name (file yang dihapus: :truncate)',
            'restore-complete' => 'Menyelesaikan pemulihan cadangan :name',
            'restore-failed' => 'Gagal menyelesaikan pemulihan cadangan :name',
            'start' => 'Memulai cadangan baru :name',
            'complete' => 'Menandai cadangan :name sebagai selesai',
            'fail' => 'Menandai cadangan :name sebagai gagal',
            'lock' => 'Mengunci cadangan :name',
            'unlock' => 'Membuka kunci cadangan :name',
        ],
        'database' => [
            'create' => 'Membuat basis data baru :name',
            'rotate-password' => 'Kata sandi basis data :name dirotasi',
            'delete' => 'Menghapus basis data :name',
        ],
        'file' => [
            'compress_one' => 'Mengompresi :directory:files.0',
            'compress_other' => 'Mengompresi :count file di :directory',
            'read' => 'Melihat isi :file',
            'copy' => 'Membuat salinan dari :file',
            'create-directory' => 'Membuat direktori :directory:name',
            'decompress' => 'Mengekstrak :files di :directory',
            'delete_one' => 'Menghapus :directory:files.0',
            'delete_other' => 'Menghapus :count file di :directory',
            'download' => 'Mengunduh :file',
            'pull' => 'Mengunduh file jarak jauh dari :url ke :directory',
            'rename_one' => 'Mengganti nama :directory:files.0.from menjadi :directory:files.0.to',
            'rename_other' => 'Mengganti nama :count file di :directory',
            'write' => 'Menulis konten baru ke :file',
            'upload' => 'Memulai unggahan file',
            'uploaded' => 'Mengunggah :directory:file',
        ],
        'sftp' => [
            'denied' => 'Memblokir akses SFTP karena masalah izin',
            'create_one' => 'Membuat :files.0',
            'create_other' => 'Membuat :count file baru',
            'write_one' => 'Mengubah isi :files.0',
            'write_other' => 'Mengubah isi :count file',
            'delete_one' => 'Menghapus :files.0',
            'delete_other' => 'Menghapus :count file',
            'create-directory_one' => 'Membuat direktori :files.0',
            'create-directory_other' => 'Membuat :count direktori',
            'rename_one' => 'Mengganti nama :files.0.from menjadi :files.0.to',
            'rename_other' => 'Mengganti nama atau memindahkan :count file',
        ],
        'allocation' => [
            'create' => 'Menambahkan :allocation ke server',
            'notes' => 'Memperbarui catatan untuk :allocation dari ":old" menjadi ":new"',
            'primary' => 'Menetapkan :allocation sebagai alokasi utama server',
            'delete' => 'Menghapus alokasi :allocation',
        ],
        'schedule' => [
            'create' => 'Membuat jadwal :name',
            'update' => 'Memperbarui jadwal :name',
            'execute' => 'Menjalankan jadwal :name secara manual',
            'delete' => 'Menghapus jadwal :name',
        ],
        'task' => [
            'create' => 'Membuat tugas ":action" baru untuk jadwal :name',
            'update' => 'Memperbarui tugas ":action" untuk jadwal :name',
            'delete' => 'Menghapus tugas untuk jadwal :name',
        ],
        'settings' => [
            'rename' => 'Mengganti nama server dari :old menjadi :new',
            'description' => 'Mengubah deskripsi server dari :old menjadi :new',
        ],
        'startup' => [
            'edit' => 'Mengubah variabel :variable dari ":old" menjadi ":new"',
            'image' => 'Memperbarui Docker Image untuk server dari :old menjadi :new',
        ],
        'subuser' => [
            'create' => 'Menambahkan :email sebagai subpengguna',
            'update' => 'Memperbarui izin subpengguna untuk :email',
            'delete' => 'Menghapus :email sebagai subpengguna',
        ],
    ],
];
