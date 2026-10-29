<?php

namespace App\Http\Requests\Sewing;

use Illuminate\Foundation\Http\FormRequest;

class StoreArticleSampleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('duration_minutes') && ! $this->filled('finished_at')) {
            $minutes = (float) $this->input('duration_minutes');
            $now = now();
            $this->merge([
                'finished_at' => $now->format('Y-m-d H:i:s'),
                'started_at' => $now->copy()->subSeconds((int) round($minutes * 60))->format('Y-m-d H:i:s'),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'tailor_id' => ['required', 'integer', 'exists:tailors,id'],
            'color' => ['required', 'string', 'max:60'],
            'working_hours' => ['nullable', 'integer', 'in:9,10,11,12'],
            'duration_minutes' => ['nullable', 'numeric', 'min:1', 'max:1440'],
            'started_at' => ['required_without:duration_minutes', 'nullable', 'date'],
            'finished_at' => ['required_without:duration_minutes', 'nullable', 'date'],
        ];
    }
}
