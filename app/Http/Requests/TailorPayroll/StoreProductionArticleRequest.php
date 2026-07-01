<?php

namespace App\Http\Requests\TailorPayroll;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductionArticleRequest extends FormRequest
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
            'color' => ['nullable', 'string', 'max:80'],
            'size' => ['nullable', 'string', 'max:50'],
            'planned_qty' => ['required', 'integer', 'min:1', 'max:1000000'],
            'ready_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
