<?php

namespace Pterodactyl\Console\Commands\Billing;

use Illuminate\Console\Command;
use Pterodactyl\Jobs\Billing\MarkInvoicePaidJob;
use Pterodactyl\Models\Billing\BillingInvoice;
use Pterodactyl\Services\Billing\PakasirGatewayService;

/**
 * Verifikasi manual satu invoice — alat pemulihan admin.
 *
 * Tidak dipanggil dari route (tombol "Saya Sudah Bayar" memakai
 * VerifyInvoicePaymentJob lewat BillingController::checkInvoice), tapi
 * dipertahankan sebagai satu-satunya cara admin memaksa pengecekan satu
 * invoice tertentu, mis. ketika webhook hilang dan invoice-nya sudah di luar
 * jendela polling.
 *
 * Hanya menangani invoice yang masih pending. Invoice yang sudah terlanjur
 * di-expire lokal padahal sudah dibayar ditangani oleh webhook (yang sengaja
 * tidak menolak invoice non-pending) atau dengan memperbaiki statusnya manual.
 */
class CheckPaymentStatusCommand extends Command
{
    protected $signature = 'billing:check {invoiceId}';

    protected $description = 'Cek status satu invoice via gateway dan terapkan bila PAID.';

    public function handle(): int
    {
        $invoice = BillingInvoice::query()->findOrFail($this->argument('invoiceId'));

        if (!$invoice->isPending()) {
            $this->info("Invoice #{$invoice->id} status: {$invoice->status} (skip).");

            return self::SUCCESS;
        }

        if (empty($invoice->inv_id)) {
            $this->error("Invoice #{$invoice->id} tidak punya txn_id, tidak ada yang bisa dicek.");

            return self::FAILURE;
        }

        // Dibungkus try/catch: tanpa ini, gateway yang tidak bisa dihubungi
        // membuat perintah artisan ini fatal, padahal pemanggilnya sedang
        // mencari jalan keluar.
        try {
            $status = app()->make(PakasirGatewayService::class)->checkTransactionStatus($invoice->inv_id);
        } catch (\Throwable $e) {
            $this->error("Gagal cek status invoice #{$invoice->id}: {$e->getMessage()}");

            return self::FAILURE;
        }

        $this->info("Invoice #{$invoice->id} status gateway: {$status}");

        if ($status === PakasirGatewayService::STATUS_PAID) {
            $invoice->update(['status' => BillingInvoice::STATUS_PAID, 'paid_at' => now()]);

            // dispatchSync, bukan dispatch()->onQueue(): pada
            // QUEUE_CONNECTION=sync tidak ada worker yang memproses antrean,
            // jadi versi queued hanya menumpuk di tabel jobs dan server tidak
            // pernah terbuat.
            MarkInvoicePaidJob::dispatchSync($invoice);
            $this->info('Invoice PAID, server sudah diproses.');
        }

        return self::SUCCESS;
    }
}
