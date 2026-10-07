<?php

namespace Pterodactyl\Console\Commands\User;

use Illuminate\Console\Command;
use Illuminate\Console\ConfirmableTrait;
use Illuminate\Database\ConnectionInterface;

/**
 * Backfill email_verified_at untuk akun yang sudah terdaftar.
 *
 * Diperlukan karena registrasi publik sempat mewajibkan verifikasi email
 * (sejak migrasi 2026_10_06_000001) sementara email verifikasinya tidak pernah
 * terkirim — VerifyEmailNotification implements ShouldQueue tanpa worker queue
 * yang berjalan. Akun dari periode itu masih email_verified_at = null dan akan
 * ditolak 403 saat checkout, padahal verifikasi sudah dimatikan sekarang.
 * Mereka tidak bisa memperbaiki sendiri karena email verifikasi tidak ada.
 *
 * Tanggal verifikasi diisi created_at, bukan waktu eksekusi: maknanya sama
 * dengan backfill di migrasi 2026_10_06_000001, jadi akun tidak terlihat
 * "berubah" pada tanggal perintah ini dijalankan.
 *
 * @see \Pterodactyl\Http\Controllers\Auth\RegisterController untuk alasan
 *      verifikasi dimatikan dan langkah mengaktifkannya kembali.
 */
class MarkVerifiedCommand extends Command
{
    use ConfirmableTrait;

    protected $signature = 'p:user:mark-verified
        {--email= : Only mark the user with this email address.}
        {--force : Skip the confirmation prompt (only shown in production).}';

    protected $description = 'Mark existing users as email-verified. Used to backfill accounts created while email verification was mandatory but non-functional.';

    public function handle(ConnectionInterface $connection): int
    {
        if (!$this->confirmToProceed('Menandai akun sebagai email terverifikasi')) {
            return self::FAILURE;
        }

        $email = trim((string) $this->option('email')) ?: null;

        $pending = $this->pendingQuery($connection, $email);

        if ($pending->count() === 0) {
            $this->info(is_null($email)
                ? 'Semua akun sudah terverifikasi. Tidak ada yang diubah.'
                : "Akun {$email} sudah terverifikasi, atau email itu tidak ditemukan.");

            return self::SUCCESS;
        }

        // Satu UPDATE massal, bukan User::update() per baris. Dua alasan:
        // updated_at tidak boleh bergerak (kolom ini menandai pendaftaran,
        // bukan perubahan akun), dan memuat + menyimpan tiap model akan memicu
        // event model serta activity log untuk tiap akun yang diperbaiki.
        $affected = $this->pendingQuery($connection, $email)->update([
            'email_verified_at' => $connection->raw('COALESCE(created_at, CURRENT_TIMESTAMP)'),
        ]);

        $this->info("{$affected} akun ditandai email terverifikasi.");

        if (is_null($email)) {
            $this->line('Jalankan ulang perintah ini tanpa --email bila ada akun baru yang muncul kemudian.');
        }

        return self::SUCCESS;
    }

    /**
     * Query akun yang belum terverifikasi, dipersempit ke satu email bila diminta.
     *
     * Query dibangun ulang (bukan disimpan lalu dipakai dua kali) supaya
     * count() tidak meninggalkan kondisi apa pun pada builder yang dipakai
     * UPDATE — dan supaya UPDATE membaca baris yang sama seperti yang dihitung.
     */
    private function pendingQuery(ConnectionInterface $connection, ?string $email): \Illuminate\Database\Query\Builder
    {
        return $connection->table('users')
            ->whereNull('email_verified_at')
            ->when(!is_null($email), fn ($query) => $query->where('email', $email));
    }
}
