<?php

namespace App\Services;

use App\Models\PayrollPeriod;
use App\Models\TailorAssignmentCompletion;
use App\ValueObjects\PayrollSlot;
use Carbon\CarbonImmutable;

/**
 * Summarises the payroll slot that today falls into, so input screens can show
 * how far the period has run and what each tailor has earned in it so far.
 */
class CurrentPayrollPeriodService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(?CarbonImmutable $today = null): array
    {
        $today ??= CarbonImmutable::today();
        $slot = PayrollSlot::containing($today);

        $period = PayrollPeriod::query()
            ->whereDate('starts_at', $slot->startsAt)
            ->whereDate('ends_at', $slot->endsAt)
            ->first();

        $tailorTotals = TailorAssignmentCompletion::query()
            ->whereBetween('completed_at', [$slot->startsAt->startOfDay(), $slot->endsAt->endOfDay()])
            ->groupBy('tailor_id')
            ->selectRaw('tailor_id, SUM(completed_qty) AS completed_qty, SUM(subtotal_amount) AS wage_amount')
            ->toBase()
            ->get();

        return [
            'starts_at' => $slot->startsAt->toDateString(),
            'ends_at' => $slot->endsAt->toDateString(),
            'days_left' => $slot->daysLeftFrom($today),
            'status' => $period?->status->value,
            'status_label' => $period?->status->label(),
            'is_locked' => $period?->isLocked() ?? false,
            'completed_qty' => (int) $tailorTotals->sum('completed_qty'),
            'wage_amount' => (int) $tailorTotals->sum('wage_amount'),
            'tailors' => $tailorTotals->map(fn (object $row) => [
                'tailor_id' => (int) $row->tailor_id,
                'completed_qty' => (int) $row->completed_qty,
                'wage_amount' => (int) $row->wage_amount,
            ])->values(),
        ];
    }
}
