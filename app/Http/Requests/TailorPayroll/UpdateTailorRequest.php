<?php

namespace App\Http\Requests\TailorPayroll;

use App\Models\Tailor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTailorRequest extends FormRequest
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
        /** @var Tailor $tailor */
        $tailor = $this->route('tailor');

        return [
            'code' => ['required', 'string', 'max:50', Rule::unique('tailors', 'code')->ignore($tailor)],
            'name' => ['required', 'string', 'max:120'],
            'whatsapp_number' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'joined_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
