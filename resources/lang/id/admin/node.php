<?php

return [
    'validation' => [
        'fqdn_not_resolvable' => 'FQDN atau alamat IP yang diberikan tidak dapat diresolusi ke alamat IP yang valid.',
        'fqdn_required_for_ssl' => 'Diperlukan nama domain lengkap (FQDN) yang dapat diresolusi ke alamat IP publik agar dapat menggunakan SSL untuk node ini.',
    ],
    'notices' => [
        'allocations_added' => 'Alokasi berhasil ditambahkan ke node ini.',
        'node_deleted' => 'Node berhasil dihapus dari panel.',
        'location_required' => 'Anda harus memiliki setidaknya satu lokasi yang dikonfigurasi sebelum dapat menambahkan node ke panel ini.',
        'node_created' => 'Node baru berhasil dibuat. Anda dapat mengonfigurasi daemon pada mesin ini secara otomatis dengan membuka tab \'Konfigurasi\'. Sebelum dapat menambahkan server, Anda harus terlebih dahulu mengalokasikan setidaknya satu alamat IP dan port.',
        'node_updated' => 'Informasi node telah diperbarui. Jika ada pengaturan daemon yang diubah, Anda perlu memulai ulang daemon agar perubahan tersebut diterapkan.',
        'unallocated_deleted' => 'Semua port yang belum dialokasikan untuk <code>:ip</code> telah dihapus.',
    ],
];
