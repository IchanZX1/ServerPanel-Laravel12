<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Nominal yang benar-benar dibayar pembeli, terpisah dari pendapatan merchant.
     *
     * Pakasir membebankan fee ke pembeli: QR yang di-scan berisi
     * `total_payment` = amount + fee, sedangkan merchant menerima `amount`
     * penuh. Dengan harga paket Rp 10.000, pembeli membayar sekitar Rp 10.310.
     *
     * `amount_cents` tetap mencatat harga paket (pendapatan, yang dijanjikan
     * ke user). Kolom ini menyimpan angka yang tampil di aplikasi pembayaran,
     * supaya halaman invoice tidak menampilkan "Total Tagihan Rp 10.000" tepat
     * sebelum pembeli melihat Rp 10.310 di layarnya.
     *
     * Nullable: invoice lama (era SociaBuzz) tidak punya nilai ini, dan
     * pemanggil jatuh ke amount_cents.
     */
    public function up(): void
    {
        Schema::table('billing_invoices', function (Blueprint $table) {
            $table->integer('total_payment_cents')->unsigned()->nullable()->after('amount_cents');
        });
    }

    public function down(): void
    {
        Schema::table('billing_invoices', function (Blueprint $table) {
            $table->dropColumn('total_payment_cents');
        });
    }
};
