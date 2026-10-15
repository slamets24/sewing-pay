<?php

namespace App\Http\Requests\Sewing;

use Illuminate\Foundation\Http\FormRequest;

class StoreQcShipmentRequest extends FormRequest
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
            'delivery_ids' => ['required', 'array', 'min:1', 'max:500'],
            'delivery_ids.*' => ['integer', 'distinct', 'exists:sewing_deliveries,id'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'delivery_ids.required' => 'Pilih minimal satu setoran yang dikirim ke QC.',
        ];
    }
}
