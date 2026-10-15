<?php

namespace App\Http\Requests\Sewing;

use App\Models\Tailor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePortalPinRequest extends FormRequest
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
        $mustChange = $this->tailor()?->mustChangePortalPin() === true;

        return [
            'pin' => ['required', 'digits:6'],
            'new_pin' => [
                Rule::requiredIf($mustChange),
                'nullable',
                'digits:6',
                'confirmed',
                'different:pin',
                Rule::notIn([Tailor::DEFAULT_PORTAL_PIN]),
            ],
            'new_pin_confirmation' => [Rule::requiredIf($mustChange), 'nullable', 'digits:6'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'pin.required' => 'PIN wajib diisi.',
            'pin.digits' => 'PIN harus 6 angka.',
            'new_pin.required' => 'PIN baru wajib diisi.',
            'new_pin.digits' => 'PIN baru harus 6 angka.',
            'new_pin.confirmed' => 'Konfirmasi PIN baru tidak sama.',
            'new_pin.different' => 'PIN baru harus berbeda dari PIN awal.',
            'new_pin.not_in' => 'Jangan memakai PIN awal 123456.',
            'new_pin_confirmation.required' => 'Konfirmasi PIN baru wajib diisi.',
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $tailor = $this->tailor();

                if ($tailor === null || ! filled($tailor->portal_pin)) {
                    $validator->errors()->add('pin', 'Portal belum dibuat.');

                    return;
                }

                if (! Hash::check($this->string('pin')->toString(), $tailor->portal_pin)) {
                    $validator->errors()->add('pin', 'PIN salah.');
                }
            },
        ];
    }

    private function tailor(): ?Tailor
    {
        $tailor = $this->route('tailor');

        return $tailor instanceof Tailor ? $tailor : null;
    }
}
