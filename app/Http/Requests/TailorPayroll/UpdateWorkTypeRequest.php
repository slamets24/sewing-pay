<?php

namespace App\Http\Requests\TailorPayroll;

use App\Enums\WorkTypeCategory;
use App\Models\WorkType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class UpdateWorkTypeRequest extends FormRequest
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
        /** @var WorkType $workType */
        $workType = $this->route('workType');

        return [
            'code' => ['nullable', 'string', 'max:50', Rule::unique('work_types', 'code')->ignore($workType)],
            'name' => ['required', 'string', 'max:160', Rule::unique('work_types', 'name')->ignore($workType)],
            'category' => ['required', new Enum(WorkTypeCategory::class)],
            'unit' => ['required', 'string', 'max:20'],
            'rate_amount' => ['required', 'integer', 'min:0', 'max:100000000'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
