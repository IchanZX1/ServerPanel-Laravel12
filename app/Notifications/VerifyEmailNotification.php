<?php

namespace Pterodactyl\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Config;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Tautan verifikasi email untuk akun hasil registrasi publik.
 *
 * Menggantikan Illuminate\Auth\Notifications\VerifyEmail supaya teksnya
 * konsisten dengan sisa notifikasi panel (Bahasa Indonesia, tanpa blok
 * markdown bawaan Laravel).
 */
class VerifyEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Signed URL berlaku 60 menit — cukup untuk dibuka dari inbox, dan
     * tidak meninggalkan tautan yang bisa dipakai lama bila email bocor.
     */
    public function __construct(private ?int $expiresInMinutes = null)
    {
        $this->expiresInMinutes = $expiresInMinutes ?? 60;
    }

    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $url = $this->verificationUrl($notifiable);

        return (new MailMessage())
            ->subject('Verifikasi Email — ' . config('app.name'))
            ->greeting('Halo ' . $notifiable->name . '!')
            ->line('Terima kasih sudah mendaftar di ' . config('app.name') . '.')
            ->line('Klik tombol di bawah untuk memverifikasi alamat email Anda. Verifikasi diperlukan sebelum bisa membeli server.')
            ->action('Verifikasi Email', $url)
            ->line('Tautan ini berlaku ' . $this->expiresInMinutes . ' menit.')
            ->line('Jika Anda tidak membuat akun ini, abaikan saja email ini.');
    }

    /**
     * URL bertanda tangan: id user + hash email. Hash membuat tautan tidak
     * bisa dipakai untuk memverifikasi email lain.
     */
    protected function verificationUrl(mixed $notifiable): string
    {
        return URL::temporarySignedRoute(
            'auth.verification.verify',
            Carbon::now()->addMinutes($this->expiresInMinutes),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );
    }
}
