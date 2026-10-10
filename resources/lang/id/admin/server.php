<?php

return [
    'exceptions' => [
        'no_new_default_allocation' => 'Anda mencoba menghapus alokasi default untuk server ini tetapi tidak ada alokasi cadangan yang dapat digunakan.',
        'marked_as_failed' => 'Server ini ditandai sebagai gagal dalam instalasi sebelumnya. Status saat ini tidak dapat diubah dalam keadaan ini.',
        'skipping_install_script' => 'Server ini dikonfigurasi untuk melewati skrip instalasi egg-nya. Pemasangan ulang tidak tersedia hingga pengaturan tersebut dinonaktifkan.',
        'bad_variable' => 'Terjadi kesalahan validasi pada variabel :name.',
        'daemon_exception' => 'Terjadi pengecualian saat mencoba berkomunikasi dengan daemon yang menghasilkan kode respons HTTP/:code. Pengecualian ini telah dicatat. (id permintaan: :request_id)',
        'default_allocation_not_found' => 'Alokasi default yang diminta tidak ditemukan dalam alokasi server ini.',
    ],
    'alerts' => [
        'startup_changed' => 'Konfigurasi startup untuk server ini telah diperbarui. Jika nest atau egg server ini diubah, pemasangan ulang akan segera dilakukan.',
        'server_deleted' => 'Server berhasil dihapus dari sistem.',
        'server_created' => 'Server berhasil dibuat di panel. Berikan daemon beberapa menit untuk menyelesaikan instalasi server ini sepenuhnya.',
        'build_updated' => 'Detail build untuk server ini telah diperbarui. Beberapa perubahan mungkin memerlukan restart agar diterapkan.',
        'suspension_toggled' => 'Status penangguhan server telah diubah menjadi :status.',
        'rebuild_on_boot' => 'Server ini ditandai sebagai memerlukan pembangunan ulang Docker Container. Ini akan terjadi saat server dijalankan berikutnya.',
        'install_toggled' => 'Status instalasi untuk server ini telah diubah.',
        'server_reinstalled' => 'Server ini telah masuk antrean untuk pemasangan ulang yang dimulai sekarang.',
        'details_updated' => 'Detail server berhasil diperbarui.',
        'docker_image_updated' => 'Berhasil mengubah image Docker default yang digunakan untuk server ini. Diperlukan reboot untuk menerapkan perubahan ini.',
        'node_required' => 'Anda harus memiliki setidaknya satu node yang dikonfigurasi sebelum dapat menambahkan server ke panel ini.',
        'transfer_nodes_required' => 'Anda harus memiliki setidaknya dua node yang dikonfigurasi sebelum dapat memindahkan server.',
        'transfer_started' => 'Pemindahan server telah dimulai.',
        'transfer_not_viable' => 'Node yang Anda pilih tidak memiliki ruang disk atau memori yang tersedia untuk mengakomodasi server ini.',
    ],
];
