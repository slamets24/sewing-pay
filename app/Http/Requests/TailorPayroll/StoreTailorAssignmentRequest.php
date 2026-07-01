<?php

namespace App\Http\Requests\TailorPayroll;

use Illuminate\Foundation\Http\FormRequest;

class StoreTailorAssignmentRequest extends FormRequest
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
            'production_article_id' => ['required', 'integer', 'exists:production_articles,id'],
            'assigned_qty' => ['required', 'integer', 'min:1', 'max:1000000'],
            'assigned_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date', 'after_or_equal:assigned_at'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
