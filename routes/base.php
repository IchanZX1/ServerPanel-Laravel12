<?php

use Illuminate\Support\Facades\Route;
use Pterodactyl\Http\Controllers\Base;
use Pterodactyl\Http\Controllers\Billing;
use Pterodactyl\Http\Middleware\RequireTwoFactorAuthentication;

Route::get('/', [Base\IndexController::class, 'index'])->name('index')->fallback();
Route::get('/account', [Base\IndexController::class, 'index'])
    ->withoutMiddleware(RequireTwoFactorAuthentication::class)
    ->name('account');

/*
|--------------------------------------------------------------------------
| Billing
|--------------------------------------------------------------------------
|
| Halaman React + JSON API billing user. Semua di belakang auth.session
| (dari RouteServiceProvider). React mount via Base\IndexController.
|
*/
Route::get('/store', [Base\IndexController::class, 'index'])->name('billing.store');
Route::get('/store/invoice/{invoiceId}', [Base\IndexController::class, 'index'])->name('billing.store.invoice');
Route::get('/account/billing', [Base\IndexController::class, 'index'])->name('billing.history');

Route::prefix('/billing/api')->group(function () {
    Route::get('/plans', [Billing\BillingController::class, 'plans'])->name('billing.api.plans');
    Route::get('/subscriptions', [Billing\BillingController::class, 'subscriptions'])->name('billing.api.subscriptions');
    Route::get('/invoices', [Billing\BillingController::class, 'invoices'])->name('billing.api.invoices');
    Route::get('/invoices/{invoice:id}', [Billing\BillingController::class, 'show'])->name('billing.api.invoice.show');
    Route::post('/checkout', [Billing\BillingController::class, 'checkout'])->name('billing.api.checkout');
    Route::post('/invoices/{invoice:id}/check', [Billing\BillingController::class, 'checkInvoice'])->name('billing.api.invoice.check');
    Route::post('/subscriptions/{subscription:id}/renew', [Billing\BillingController::class, 'renew'])->name('billing.api.subscription.renew');
});

Route::get('/locales/locale.json', Base\LocaleController::class)
    ->withoutMiddleware(['auth', RequireTwoFactorAuthentication::class])
    ->where('namespace', '.*');

Route::get('/{react}', [Base\IndexController::class, 'index'])
    ->where('react', '^(?!(\/)?(api|auth|admin|daemon)).+');
