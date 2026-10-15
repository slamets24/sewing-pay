<?php

namespace App\Http\Requests\Sewing;

use App\Enums\TailorType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TailorRequest extends FormRequest
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
            'code' => ['required', 'string', 'max:50', Rule::unique('tailors', 'code')->ignore($this->route('tailor'))],
            'name' => ['required', 'string', 'max:120'],
            'type' => ['required', Rule::enum(TailorType::class)],
            'whatsapp_number' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
