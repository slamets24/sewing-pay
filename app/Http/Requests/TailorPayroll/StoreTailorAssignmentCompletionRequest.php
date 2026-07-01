<?php

namespace App\Http\Requests\TailorPayroll;

use Illuminate\Foundation\Http\FormRequest;

class StoreTailorAssignmentCompletionRequest extends FormRequest
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
            'completed_qty' => ['required', 'integer', 'min:1', 'max:1000000'],
            'defect_qty' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'revision_qty' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'completed_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
