<?php

return [
    'daemon_connection_failed' => 'Terjadi pengecualian saat mencoba berkomunikasi dengan daemon yang menghasilkan kode respons HTTP/:code. Pengecualian ini telah dicatat.',
    'node' => [
        'servers_attached' => 'Sebuah node harus tidak memiliki server yang tertaut padanya agar dapat dihapus.',
        'daemon_off_config_updated' => 'Konfigurasi daemon telah diperbarui, namun terjadi kesalahan saat mencoba memperbarui berkas konfigurasi pada Daemon secara otomatis. Anda perlu memperbarui berkas konfigurasi (config.yml) secara manual agar daemon menerapkan perubahan ini.',
    ],
    'allocations' => [
        'server_using' => 'Saat ini ada server yang ditetapkan pada alokasi ini. Alokasi hanya dapat dihapus jika tidak ada server yang ditetapkan padanya.',
        'too_many_ports' => 'Menambahkan lebih dari 1000 port dalam satu rentang sekaligus tidak didukung.',
        'invalid_mapping' => 'Pemetaan yang diberikan untuk :port tidak valid dan tidak dapat diproses.',
        'cidr_out_of_range' => 'Notasi CIDR hanya mengizinkan mask antara /25 dan /32.',
        'port_out_of_range' => 'Port dalam sebuah alokasi harus lebih besar dari 1024 dan kurang dari atau sama dengan 65535.',
    ],
    'nest' => [
        'delete_has_servers' => 'Nest yang memiliki server aktif yang tertaut padanya tidak dapat dihapus dari Panel.',
        'egg' => [
            'delete_has_servers' => 'Egg yang memiliki server aktif yang tertaut padanya tidak dapat dihapus dari Panel.',
            'invalid_copy_id' => 'Egg yang dipilih untuk menyalin skrip tidak ada, atau sedang menyalin skripnya sendiri.',
            'must_be_child' => 'Direktif "Copy Settings From" untuk Egg ini harus berupa opsi anak dari Nest yang dipilih.',
            'has_children' => 'Egg ini merupakan induk dari satu atau lebih Egg lainnya. Silakan hapus Egg tersebut sebelum menghapus Egg ini.',
        ],
        'variables' => [
            'env_not_unique' => 'Variabel lingkungan :name harus unik untuk Egg ini.',
            'reserved_name' => 'Variabel lingkungan :name dilindungi dan tidak dapat ditetapkan ke sebuah variabel.',
            'bad_validation_rule' => 'Aturan validasi ":rule" bukan aturan yang valid untuk aplikasi ini.',
        ],
        'importer' => [
            'json_error' => 'Terjadi kesalahan saat mencoba mengurai berkas JSON: :error.',
            'file_error' => 'Berkas JSON yang diberikan tidak valid.',
            'invalid_json_provided' => 'Berkas JSON yang diberikan tidak dalam format yang dapat dikenali.',
        ],
    ],
    'subusers' => [
        'editing_self' => 'Mengubah akun subpengguna Anda sendiri tidak diizinkan.',
        'user_is_owner' => 'Anda tidak dapat menambahkan pemilik server sebagai subpengguna untuk server ini.',
        'subuser_exists' => 'Pengguna dengan alamat email tersebut sudah ditetapkan sebagai subpengguna untuk server ini.',
    ],
    'databases' => [
        'delete_has_databases' => 'Tidak dapat menghapus server host basis data yang memiliki basis data aktif yang tertaut padanya.',
    ],
    'tasks' => [
        'chain_interval_too_long' => 'Interval waktu maksimum untuk tugas berantai adalah 15 menit.',
    ],
    'locations' => [
        'has_nodes' => 'Tidak dapat menghapus lokasi yang memiliki node aktif yang tertaut padanya.',
    ],
    'users' => [
        'node_revocation_failed' => 'Gagal mencabut kunci pada <a href=":link">Node #:node</a>. :error',
    ],
    'deployment' => [
        'no_viable_nodes' => 'Tidak ditemukan node yang memenuhi persyaratan yang ditentukan untuk penerapan otomatis.',
        'no_viable_allocations' => 'Tidak ditemukan alokasi yang memenuhi persyaratan untuk penerapan otomatis.',
    ],
    'api' => [
        'resource_not_found' => 'Sumber daya yang diminta tidak ada di server ini.',
    ],
];
