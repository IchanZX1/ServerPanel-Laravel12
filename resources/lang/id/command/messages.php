<?php

return [
    'location' => [
        'no_location_found' => 'Tidak dapat menemukan catatan yang cocok dengan kode singkat yang diberikan.',
        'ask_short' => 'Kode Singkat Lokasi',
        'ask_long' => 'Deskripsi Lokasi',
        'created' => 'Berhasil membuat lokasi baru (:name) dengan ID :id.',
        'deleted' => 'Lokasi yang diminta berhasil dihapus.',
    ],
    'user' => [
        'search_users' => 'Masukkan Nama Pengguna, ID Pengguna, atau Alamat Email',
        'select_search_user' => 'ID pengguna yang akan dihapus (Masukkan \'0\' untuk mencari ulang)',
        'deleted' => 'Pengguna berhasil dihapus dari Panel.',
        'confirm_delete' => 'Apakah Anda yakin ingin menghapus pengguna ini dari Panel?',
        'no_users_found' => 'Tidak ada pengguna yang ditemukan untuk kata kunci pencarian yang diberikan.',
        'multiple_found' => 'Ditemukan beberapa akun untuk pengguna yang diberikan, tidak dapat menghapus pengguna karena flag --no-interaction.',
        'ask_admin' => 'Apakah pengguna ini administrator?',
        'ask_email' => 'Alamat Email',
        'ask_username' => 'Nama Pengguna',
        'ask_name_first' => 'Nama Depan',
        'ask_name_last' => 'Nama Belakang',
        'ask_password' => 'Kata Sandi',
        'ask_password_tip' => 'Jika Anda ingin membuat akun dengan kata sandi acak yang dikirim ke email pengguna, jalankan ulang perintah ini (CTRL+C) dan sertakan flag `--no-password`.',
        'ask_password_help' => 'Kata sandi harus minimal 8 karakter dan mengandung setidaknya satu huruf kapital dan angka.',
        '2fa_help_text' => [
            'Perintah ini akan menonaktifkan autentikasi 2 faktor untuk akun pengguna jika sedang aktif. Ini sebaiknya hanya digunakan sebagai perintah pemulihan akun jika pengguna terkunci dari akunnya.',
            'Jika bukan ini yang Anda inginkan, tekan CTRL+C untuk keluar dari proses ini.',
        ],
        '2fa_disabled' => 'Autentikasi 2 Faktor telah dinonaktifkan untuk :email.',
    ],
    'schedule' => [
        'output_line' => 'Mengirim tugas untuk tugas pertama di `:schedule` (:hash).',
    ],
    'maintenance' => [
        'deleting_service_backup' => 'Menghapus berkas cadangan layanan :file.',
    ],
    'server' => [
        'rebuild_failed' => 'Permintaan pembangunan ulang untuk ":name" (#:id) pada node ":node" gagal dengan kesalahan: :message',
        'reinstall' => [
            'failed' => 'Permintaan pemasangan ulang untuk ":name" (#:id) pada node ":node" gagal dengan kesalahan: :message',
            'confirm' => 'Anda akan melakukan pemasangan ulang pada sekelompok server. Apakah Anda ingin melanjutkan?',
        ],
        'power' => [
            'confirm' => 'Anda akan melakukan :action pada :count server. Apakah Anda ingin melanjutkan?',
            'action_failed' => 'Permintaan aksi daya untuk ":name" (#:id) pada node ":node" gagal dengan kesalahan: :message',
        ],
    ],
    'environment' => [
        'mail' => [
            'ask_smtp_host' => 'Host SMTP (mis. smtp.gmail.com)',
            'ask_smtp_port' => 'Port SMTP',
            'ask_smtp_username' => 'Nama Pengguna SMTP',
            'ask_smtp_password' => 'Kata Sandi SMTP',
            'ask_mailgun_domain' => 'Domain Mailgun',
            'ask_mailgun_endpoint' => 'Endpoint Mailgun',
            'ask_mailgun_secret' => 'Secret Mailgun',
            'ask_mandrill_secret' => 'Secret Mandrill',
            'ask_postmark_username' => 'Kunci API Postmark',
            'ask_driver' => 'Driver mana yang harus digunakan untuk mengirim email?',
            'ask_mail_from' => 'Alamat email asal pengiriman email',
            'ask_mail_name' => 'Nama yang ditampilkan sebagai pengirim email',
            'ask_encryption' => 'Metode enkripsi yang digunakan',
        ],
    ],
];
