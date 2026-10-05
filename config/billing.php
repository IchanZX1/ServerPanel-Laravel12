<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Sociabuzz via Maelyn API
    |--------------------------------------------------------------------------
    |
    | Gateway custom untuk billing panel. Create payment via Maelyn API,
    | cek status via scrape <title> redirect_url (tak ada webhook).
    | Lihat .docs/sociabuzz.js untuk kontrak asal.
    */

    'maelyn_base_url' => env('MAELYN_BASE_URL', 'https://api.maelyn.eu/api/payment/sociabuzz'),
    'maelyn_api_key' => env('MAELYN_API_KEY', ''),
    'sociabuzz_username' => env('SOCIABUZZ_USERNAME', 'kureiza'),

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
    | masih sempat ter-scrape sebagai PAID.
    */
    'expiry_grace_seconds' => (int) env('BILLING_EXPIRY_GRACE_SECONDS', 120),

    /*
    |--------------------------------------------------------------------------
    | Masa hidup halaman invoice (menit)
    |--------------------------------------------------------------------------
    |
    | Halaman /store/invoice/{id} hanya bisa diakses selama ini. Setelah lewat,
    | invoice di-expire otomatis dan payload pembayaran (QR + redirect_url)
    | dibersihkan oleh scheduler. Default 3 menit mengikuti masa berlaku
    | invoice di gateway.
    */
    'invoice_lifetime_minutes' => (int) env('BILLING_INVOICE_LIFETIME_MINUTES', 3),

    // Renewal otomatis dibuat H-x sebelum subscription expires_at.
    'renewal_days_before' => (int) env('BILLING_RENEWAL_DAYS_BEFORE', 3),

    // Masa tenggang setelah expires_at sebelum server di-suspend (hari).
    'grace_period_days' => (int) env('BILLING_GRACE_PERIOD_DAYS', 0),

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
