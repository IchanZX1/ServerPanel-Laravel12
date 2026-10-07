<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Pakasir (QRIS only)
    |--------------------------------------------------------------------------
    |
    | Gateway komersial untuk billing panel. Lihat .docs/pakasir.txt untuk
    | kontrak API v2.
    |
    | Metode yang dipakai hanya QRIS: panel merender QR sendiri dari qr_string
    | yang dikembalikan create-transaction, jadi tidak ada redirect_url dan
    | user tidak pernah meninggalkan halaman invoice.
    |
    | Slug + api_key + webhook_secret diambil dari halaman detail proyek di
    | dashboard Pakasir. `webhook_secret` dipakai untuk memverifikasi header
    | X-Secret pada POST webhook.
    */
    'pakasir' => [
        'base_url' => env('PAKASIR_BASE_URL', 'https://app.pakasir.com'),
        'slug' => env('PAKASIR_SLUG', ''),
        'api_key' => env('PAKASIR_API_KEY', ''),
        'webhook_secret' => env('PAKASIR_WEBHOOK_SECRET', ''),

        // Jendela polling agresif (menit) sejak invoice dibuat.
        //
        // Scheduler `billing:verify-pending` memanggil API status tiap menit,
        // tapi hanya untuk invoice yang masih di dalam jendela ini. Setelahnya
        // webhook yang jadi jalur utama dan ExpireInvoicesCommand menangani
        // batas waktunya. Alasannya: rate limit status Pakasir 1 request per
        // 4 detik per transaksi, dan QRIS bisa berlaku sampai 24 jam — mem-poll
        // ribuan invoice tua tiap menit hanya membuang kuota.
        //
        // Tombol "Saya Sudah Bayar" TIDAK terpengaruh: checkInvoice() memanggil
        // job verifikasi langsung, di luar jendela ini.
        'poll_window_minutes' => (int) env('BILLING_PAKASIR_POLL_WINDOW_MINUTES', 60),
    ],

    // Jeda polling status invoice (detik).
    //
    // Diabaikan saat QUEUE_CONNECTION=sync — polling sebenarnya dijalankan
    // scheduler `billing:verify-pending` setiap menit. Nilai ini dipakai
    // kalau panel memakai queue driver yang benar-benar antre (database/redis).
    'poll_interval_seconds' => (int) env('BILLING_POLL_INTERVAL', 30),

    /*
    |--------------------------------------------------------------------------
    | Grace period expiry (detik)
    |--------------------------------------------------------------------------
    |
    | Jarak aman setelah `gateway_expires_at` sebelum invoice di-expire saat
    | status gateway tidak terbaca. Pembayaran yang masuk tepat di menit akhir
    | masih sempat terverifikasi.
    */
    'expiry_grace_seconds' => (int) env('BILLING_EXPIRY_GRACE_SECONDS', 120),

    /*
    |--------------------------------------------------------------------------
    | Fallback masa hidup invoice (menit)
    |--------------------------------------------------------------------------
    |
    | HANYA dipakai bila `gateway_expires_at` kosong — yaitu bila gateway tidak
    | mengirim `expired_at` atau gagal di-parse. Normalnya batas bayar diambil
    | apa adanya dari Pakasir, yang jauh lebih lama (QRIS hingga 24 jam), supaya
    | countdown di panel dan masa berlaku QR di aplikasi pembayaran tidak
    | berbeda. Jangan dipakai untuk mempersingkat batas bayar: invoice yang
    | di-expire lokal sementara QR masih bisa discan berarti uang masuk tanpa
    | server yang dibuat.
    */
    'invoice_lifetime_minutes' => (int) env('BILLING_INVOICE_LIFETIME_MINUTES', 3),

    // Renewal otomatis dibuat H-x sebelum subscription expires_at.
    'renewal_days_before' => (int) env('BILLING_RENEWAL_DAYS_BEFORE', 3),

    // Masa tenggang setelah expires_at sebelum server di-suspend (hari).
    'grace_period_days' => (int) env('BILLING_GRACE_PERIOD_DAYS', 0),

    /*
    |--------------------------------------------------------------------------
    | Auto-PAID saat checkout (DEVELOPMENT ONLY)
    |--------------------------------------------------------------------------
    |
    | Bila true DAN app tidak production, checkout langsung menandai invoice
    | PAID dan mem-provision server — tanpa gateway, tanpa klik
    | "Saya Sudah Bayar". Selalu false di production: proteksi ganda seperti
    | `ssl_verify_disabled` di bawah (flag ini DAN app()->isProduction()).
    |
    | Hanya menjaga checkout(). renew() dan billing:generate-renewals tidak
    | menghormatinya dan selalu memanggil gateway sungguhan.
    */
    'dev_auto_paid' => (bool) env('BILLING_DEV_AUTO_PAID', false),

    /*
    |--------------------------------------------------------------------------
    | Bypass verifikasi SSL (DEVELOPMENT ONLY)
    |--------------------------------------------------------------------------
    |
    | Aktifkan hanya di mesin dev (BILLING_SSL_VERIFY_DISABLED=true di .env).
    | Diperlukan bila antivirus (Avast Web Shield dsb) meng-intercept TLS dan
    | menyebabkan cURL error 60. Selalu false di production — proteksi ganda:
    | flag ini DAN app()->isProduction().
    */
    'ssl_verify_disabled' => (bool) env('BILLING_SSL_VERIFY_DISABLED', false),
];
