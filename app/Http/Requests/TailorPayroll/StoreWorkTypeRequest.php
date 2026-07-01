<?php

namespace App\Http\Requests\TailorPayroll;

use App\Enums\WorkTypeCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class StoreWorkTypeRequest extends FormRequest
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
            'code' => ['nullable', 'string', 'max:50', 'unique:work_types,code'],
            'name' => ['required', 'string', 'max:160', 'unique:work_types,name'],
            'category' => ['required', new Enum(WorkTypeCategory::class)],
            'unit' => ['required', 'string', 'max:20'],
            'rate_amount' => ['required', 'integer', 'min:0', 'max:100000000'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
