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
     * pesan sukses + status; frontend yang mengarahkan. Notifikasi
     * AccountCreated tetap dikirim (walau user sudah punya password, email
     * tetap berguna sebagai konfirmasi akun — tanpa setup token).
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = $this->creationService->handle($request->normalize());

        Activity::event('auth:register')->withRequestMetadata()->subject($user)->log();

        return new JsonResponse([
            'data' => [
                'complete' => true,
                'message' => 'Akun berhasil dibuat. Silakan login.',
                'email' => $user->email,
            ],
        ], 201);
    }
}
