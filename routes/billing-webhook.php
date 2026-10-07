<?php

use Illuminate\Support\Facades\Route;
use Pterodactyl\Http\Controllers\Billing\PakasirWebhookController;

/*
|--------------------------------------------------------------------------
| Billing Webhook Routes
|--------------------------------------------------------------------------
|
| Endpoint publik untuk notifikasi server-to-server dari payment gateway.
| Tidak ada session dan tidak ada CSRF di sini: grup ini didaftarkan di luar
| grup middleware `web` (lihat RouteServiceProvider), dan autentikasinya
| memakai header X-Secret yang diverifikasi di controller.
|
| Jangan pindahkan route ini ke routes/base.php — grup itu dibungkus
| auth.session + RequireTwoFactorAuthentication, yang akan menolak POST
| tanpa session dari gateway.
|
*/

Route::post('/pakasir', PakasirWebhookController::class)->name('billing.webhook.pakasir');
