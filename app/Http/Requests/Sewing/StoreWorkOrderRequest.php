<?php

namespace App\Http\Requests\Sewing;

use Illuminate\Foundation\Http\FormRequest;

class StoreWorkOrderRequest extends FormRequest
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
            'number' => ['required', 'string', 'max:60', 'unique:work_orders,number'],
            'channel' => ['nullable', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:60'],
            'ordered_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'source_text' => ['nullable', 'string', 'max:20000'],
            'is_opening_stock' => ['boolean'],
            'items' => ['required', 'array', 'min:1', 'max:500'],
            'items.*.article_id' => ['required', 'integer', 'exists:articles,id'],
            'items.*.color' => ['nullable', 'string', 'max:80'],
            'items.*.size' => ['nullable', 'string', 'max:20'],
            'items.*.planned_qty' => ['required', 'integer', 'min:1', 'max:100000'],
            'items.*.alias' => ['nullable', 'string', 'max:200'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'number.unique' => 'Nomor WO ini sudah ada.',
            'items.required' => 'Isi minimal satu baris artikel.',
            'items.*.article_id.required' => 'Ada baris yang artikelnya belum dipilih.',
        ];
    }
}
