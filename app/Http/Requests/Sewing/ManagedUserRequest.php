<?php

namespace App\Http\Requests\Sewing;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/** Create a staff account, or change its role. Tailors use a portal link, not an email login. */
class ManagedUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->route('user');
        $isCreate = $user === null;

        return [
            'name' => [$isCreate ? 'required' : 'prohibited', 'string', 'max:255'],
            'email' => [$isCreate ? 'required' : 'prohibited', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => [$isCreate ? 'required' : 'prohibited', 'confirmed', Password::defaults()],
            'role' => ['required', Rule::enum(UserRole::class), Rule::notIn([UserRole::Tailor->value])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'role.not_in' => 'Penjahit tidak punya akun email. Buat tautan portal dari menu Penjahit.',
        ];
    }
}
