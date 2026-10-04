<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

/**
 * redirect_url/qr_string harus nullable agar payload pembayaran bisa
 * dibersihkan setelah invoice expired (halaman invoice 3 menit).
 */
class MakeBillingInvoicePaymentPayloadNullable extends Migration
{
    public function up(): void
    {
        Schema::table('billing_invoices', function (Blueprint $table) {
            $table->text('redirect_url')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('billing_invoices', function (Blueprint $table) {
            $table->text('redirect_url')->nullable(false)->change();
        });
    }
}
