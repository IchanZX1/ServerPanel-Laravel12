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
     * Akun dibuat TANPA email_verified_at ($verified = false): registrasi
     * publik tidak tepercaya, jadi verifikasi email wajib sebelum bisa
     * checkout. Notifikasi AccountCreated sekaligus membawa tautan verifikasi.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = $this->creationService->handle($request->normalize(), verified: false);

        // Kirim tautan verifikasi. Kegagalan kirim email tidak boleh
        // menggagalkan registrasi — akun sudah jadi, user bisa minta ulang
        // dari halaman login.
        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            report($e);
        }

        Activity::event('auth:register')->withRequestMetadata()->subject($user)->log();

        return new JsonResponse([
            'data' => [
                'complete' => true,
                'message' => 'Akun berhasil dibuat. Cek email Inbox atau Spam Inbox untuk verifikasi, lalu login.',
                'email' => $user->email,
            ],
        ], 201);
    }
}
