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

    // Jeda polling status invoice (detik). Invoice gateway expired ~3 menit.
    'poll_interval_seconds' => (int) env('BILLING_POLL_INTERVAL', 30),

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
