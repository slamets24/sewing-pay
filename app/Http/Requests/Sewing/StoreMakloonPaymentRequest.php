<?php

namespace App\Http\Requests\Sewing;

use Illuminate\Foundation\Http\FormRequest;

class StoreMakloonPaymentRequest extends FormRequest
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
            'tailor_id' => ['required', 'integer', 'exists:tailors,id'],
            'delivery_ids' => ['required', 'array', 'min:1'],
            'delivery_ids.*' => ['required', 'integer', 'exists:sewing_deliveries,id'],
            'payment_date' => ['nullable', 'date'],
            'adjustment_amount' => ['nullable', 'integer'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'tailor_id.required' => 'Pilih penjahit maklun terlebih dahulu.',
            'delivery_ids.required' => 'Pilih minimal satu setoran yang akan dibayar.',
            'delivery_ids.min' => 'Pilih minimal satu setoran yang akan dibayar.',
        ];
    }
}
