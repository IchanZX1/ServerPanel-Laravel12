<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

/**
 * Verifikasi email untuk registrasi publik.
 *
 * Akun lama di-backfill terverifikasi (memakai created_at) supaya pengguna
 * yang sudah ada tidak mendadak terkunci dari pembelian server. Yang perlu
 * diverifikasi hanyalah akun yang mendaftar setelah kolom ini ada.
 */
class AddEmailVerifiedAtToUsersTable extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('email_verified_at')->nullable()->after('email');
        });

        DB::table('users')
            ->whereNull('email_verified_at')
            ->update(['email_verified_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('email_verified_at');
        });
    }
}
