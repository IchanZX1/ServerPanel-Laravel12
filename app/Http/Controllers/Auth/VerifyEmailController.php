<?php

namespace Pterodactyl\Http\Controllers\Auth;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Models\User;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Http\Controllers\Controller;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Redirect;

class VerifyEmailController extends Controller
{
    /**
     * Tangani klik tautan verifikasi dari email.
     *
     * Rute ini berada di grup `guest`: user yang mendaftar belum login saat
     * membuka email. Keamanan bersandar pada signed URL (id + sha1 email),
     * bukan pada sesi.
     */
    public function verify(Request $request, int $id, string $hash)
    {
        $user = User::query()->find($id);

        // Tautan valid tapi akun sudah tidak ada (mis. dihapus admin).
        if (is_null($user)) {
            return Redirect::to('/auth/login?verified=0');
        }

        if (!hash_equals($hash, sha1($user->getEmailForVerification()))) {
            return Redirect::to('/auth/login?verified=0');
        }

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();

            Activity::event('auth:email-verified')->subject($user)->log();
        }

        return Redirect::to('/auth/login?verified=1');
    }

    /**
     * Kirim ulang tautan verifikasi untuk user yang sedang login.
     *
     * Dipakai banner "email belum diverifikasi" di dashboard. Throttle
     * dipasang di rute supaya tidak bisa dipakai untuk spam email.
     */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return new JsonResponse([
                'message' => 'Email sudah terverifikasi, Silahkan login.',
            ]);
        }

        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            report($e);

            return new JsonResponse([
                'message' => 'Gagal mengirim email verifikasi. Coba lagi nanti.',
            ], 500);
        }

        return new JsonResponse([
            'message' => 'Tautan verifikasi sudah dikirim ulang. Cek inbox Anda.',
        ]);
    }
}
