<?php

namespace App\Http\Requests\Sewing;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RevisionPartRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:100', Rule::unique('revision_parts', 'name')->ignore($this->route('revisionPart'))],
            'price' => ['required', 'integer', 'min:0', 'max:10000000'],
            'material_type' => ['required', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
