<?php

namespace Pterodactyl\Console\Commands\Billing;

use Illuminate\Console\Command;
use Pterodactyl\Jobs\Billing\VerifyInvoicePaymentJob;
use Pterodactyl\Models\Billing\BillingInvoice;

/**
 * Dispatch verify job untuk invoice pending yang masih di dalam jendela polling.
 *
 * Sejak migrasi ke Pakasir, webhook adalah jalur utama dan perintah ini adalah
 * jaring pengaman. Jendela waktu (billing.pakasir.poll_window_minutes) ada
 * karena dua hal: rate limit API status Pakasir 1 request per 4 detik per
 * transaksi, dan QRIS bisa berlaku sampai 24 jam — tanpa jendela, invoice tua
 * yang ditinggalkan user akan dipoll selamanya.
 *
 * Invoice di luar jendela tetap tertangani oleh:
 * - webhook Pakasir (pembayaran sebenarnya hampir selalu lewat sini), dan
 * - ExpireInvoicesCommand untuk batas waktunya.
 *
 * Tombol "Saya Sudah Bayar" tidak bergantung pada perintah ini:
 * BillingController::checkInvoice() memanggil job-nya langsung.
 */
class VerifyPendingInvoicesCommand extends Command
{
    protected $signature = 'billing:verify-pending';

    protected $description = 'Dispatch verify job untuk invoice pending di dalam jendela polling.';

    public function handle(): int
    {
        $windowMinutes = (int) config('billing.pakasir.poll_window_minutes', 60);

        $invoices = BillingInvoice::query()
            ->where('status', BillingInvoice::STATUS_PENDING)
            ->where('created_at', '>=', now()->subMinutes($windowMinutes))
            ->get();

        foreach ($invoices as $invoice) {
            VerifyInvoicePaymentJob::dispatch($invoice)->onQueue('billing');
        }

        $this->info("Dispatched {$invoices->count()} invoice(s) (window: {$windowMinutes}m).");

        return self::SUCCESS;
    }
}
