<?php

namespace Pterodactyl\Http\Requests\Api\Client\Account;

use Pterodactyl\Models\User;
use Illuminate\Validation\Rule;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class UpdateAccountLanguageRequest extends ClientApiRequest
{
    /**
     * Aturan validasi.
     *
     * Kode bahasa yang diterima adalah kode yang folder terjemahannya benar-benar
     * ada di resources/lang (lewat User::getAvailableLanguages()), bukan sekadar
     * regex dua huruf. Dengan begitu tombol bahasa di sidebar tidak bisa
     * menyimpan kode yang tidak punya terjemahan sama sekali.
     */
    public function rules(): array
    {
        return [
            'language' => [
                'required',
                'string',
                Rule::in(array_keys((new User())->getAvailableLanguages())),
            ],
        ];
    }
}
