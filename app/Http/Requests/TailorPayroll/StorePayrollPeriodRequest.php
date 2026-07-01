<?php

namespace App\Http\Requests\TailorPayroll;

use App\Models\PayrollPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePayrollPeriodRequest extends FormRequest
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
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after_or_equal:starts_at'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $startsAt = CarbonImmutable::parse($this->input('starts_at'))->startOfDay();
                $endsAt = CarbonImmutable::parse($this->input('ends_at'))->startOfDay();

                if (! $startsAt->isSameMonth($endsAt)) {
                    $validator->errors()->add('ends_at', 'Periode gaji harus berada dalam bulan yang sama.');
                    return;
                }

                $isFirstHalf = $startsAt->day === 1 && $endsAt->day === 14;
                $isSecondHalf = $startsAt->day === 15 && $endsAt->isSameDay($startsAt->endOfMonth());

                if (! $isFirstHalf && ! $isSecondHalf) {
                    $validator->errors()->add('ends_at', 'Periode gaji harus slot 1-14 atau 15-akhir bulan.');
                    return;
                }

                $overlaps = PayrollPeriod::query()
                    ->whereDate('starts_at', '<=', $endsAt)
                    ->whereDate('ends_at', '>=', $startsAt)
                    ->exists();

                if ($overlaps) {
                    $validator->errors()->add('starts_at', 'Periode gaji bertabrakan dengan periode yang sudah ada.');
                }
            },
        ];
    }
}
