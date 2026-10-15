<?php

namespace App\Http\Requests\TailorPayroll;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreProductionArticleBatchRequest extends FormRequest
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
            'work_type_id' => ['required', 'integer', 'exists:work_types,id'],
            'article_name' => ['required', 'string', 'max:160'],
            'ready_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'variants' => ['required', 'array', 'min:1', 'max:100'],
            'variants.*.color' => ['nullable', 'string', 'max:80'],
            'variants.*.size' => ['nullable', 'string', 'max:50'],
            'variants.*.planned_qty' => ['required', 'integer', 'min:1', 'max:1000000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'variants.required' => 'Isi qty minimal untuk satu warna/size.',
            'variants.*.planned_qty.min' => 'Qty tiap varian minimal 1.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $duplicates = collect($this->input('variants'))
                    ->map(fn (array $variant) => mb_strtolower(trim((string) ($variant['color'] ?? '')).'|'.trim((string) ($variant['size'] ?? ''))))
                    ->duplicates();

                if ($duplicates->isNotEmpty()) {
                    $validator->errors()->add('variants', 'Kombinasi warna dan size tidak boleh dobel.');
                }
            },
        ];
    }
}
