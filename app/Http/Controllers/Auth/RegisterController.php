<?php

namespace Pterodactyl\Http\Controllers\Auth;

use Illuminate\Http\JsonResponse;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Http\Requests\Auth\RegisterRequest;
use Pterodactyl\Services\Users\UserCreationService;

class RegisterController extends AbstractLoginController
{
    public function __construct(private UserCreationService $creationService)
    {
        parent::__construct();
    }

    /**
     * Buat akun baru untuk registrasi publik, lalu arahkan ke halaman login.
     *
     * Pilihan desain: tidak auto-login (ke halaman login). Jadi hanya kirim
     * pesan sukses + status; frontend yang mengarahkan.
     *
     * VERIFIKASI EMAIL SEDANG DIMATIKAN. Akun dibuat lewat default
     * UserCreationService ($verified = true), jadi langsung punya
     * email_verified_at dan bisa checkout seketika. Tidak ada email yang
     * dikirim dari sini.
     *
     * Alasannya: VerifyEmailNotification implements ShouldQueue, sementara
     * queue tidak punya worker yang berjalan. Job-nya hanya menumpuk di tabel
     * `jobs` dan tidak pernah diproses — tanpa exception, sehingga pesan sukses
     * tetap terkirim untuk email yang tidak pernah datang. Akibatnya user
     * terkunci permanen dari checkout: tidak bisa memverifikasi karena email
     * tidak ada, tidak bisa membeli karena belum terverifikasi.
     *
     * Satu-satunya penghalang registrasi sekarang adalah captcha ('recaptcha'
     * di routes/auth.php). Jangan sampai dinonaktifkan di /admin/settings.
     *
     * Mengaktifkan kembali verifikasi (ketiganya harus jalan bersama):
     * 1. Jalankan worker queue (systemctl enable --now pteroq), ATAU buang
     *    ShouldQueue dari VerifyEmailNotification.
     * 2. Kembalikan `verified: false` di sini + panggil
     *    sendEmailVerificationNotification().
     * 3. Gate hasVerifiedEmail() di BillingController (checkout + renew) sudah
     *    utuh dan akan langsung aktif lagi tanpa perubahan.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        // Default $verified = true: akun langsung teverifikasi. Lihat docblock.
        $user = $this->creationService->handle($request->normalize());

        Activity::event('auth:register')->withRequestMetadata()->subject($user)->log();

        return new JsonResponse([
            'data' => [
                'complete' => true,
                'message' => 'Akun berhasil dibuat, silakan login.',
                'email' => $user->email,
            ],
        ], 201);
    }
}
