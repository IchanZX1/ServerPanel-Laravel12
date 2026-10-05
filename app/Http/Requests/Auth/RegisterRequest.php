<?php

namespace Pterodactyl\Http\Requests\Auth;

use Pterodactyl\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Ambil aturan dari User::getRules() agar konsisten dengan pembuatan akun
     * dari sisi admin, lalu tambah konfirmasi password.
     */
    public function rules(): array
    {
        return Collection::make(User::getRules())
            ->only([
                'email',
                'username',
                'name_first',
                'name_last',
                'password',
            ])
            ->put('password', ['required', 'string', 'min:8', 'confirmed'])
            ->toArray();
    }

    /**
     * Hanya field yang kita izinkan — mencegah user menyetel root_admin/use_totp.
     */
    public function normalize(): array
    {
        return $this->only([
            'email',
            'username',
            'name_first',
            'name_last',
            'password',
        ]);
    }
}
