<?php

namespace App\Http\Requests\TailorPayroll;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules;

class ResetManagedUserPasswordRequest extends FormRequest
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
        return [
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ];
    }
}
