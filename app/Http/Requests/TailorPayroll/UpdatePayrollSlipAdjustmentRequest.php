<?php

namespace App\Http\Requests\TailorPayroll;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePayrollSlipAdjustmentRequest extends FormRequest
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
            'bonus_amount' => ['required', 'integer', 'min:0', 'max:100000000'],
            'deduction_amount' => ['required', 'integer', 'min:0', 'max:100000000'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
