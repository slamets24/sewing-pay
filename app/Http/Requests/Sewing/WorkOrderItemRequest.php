<?php

namespace App\Http\Requests\Sewing;

use Illuminate\Foundation\Http\FormRequest;

/** Adding a line needs the article and variant; re-planning only sends the qty. */
class WorkOrderItemRequest extends FormRequest
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
        $isUpdate = $this->isMethod('patch');

        return [
            'article_id' => [$isUpdate ? 'prohibited' : 'required', 'integer', 'exists:articles,id'],
            'color' => ['nullable', 'string', 'max:80'],
            'size' => ['nullable', 'string', 'max:20'],
            'item_type' => ['nullable', 'string', 'in:print,polosan'],
            'planned_qty' => ['required', 'integer', 'min:1', 'max:100000'],
        ];
    }
}
