<?php

namespace App\Actions;

use App\Enums\PayrollPeriodStatus;
use App\Enums\PayrollSlipStatus;
use App\Models\PayrollSlip;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MarkPayrollSlipPaidAction
{
    public function execute(PayrollSlip $slip): PayrollSlip
    {
        return DB::transaction(function () use ($slip) {
            $slip = PayrollSlip::query()
                ->with('period')
                ->lockForUpdate()
                ->findOrFail($slip->id);

            if ($slip->period->status === PayrollPeriodStatus::Draft) {
                throw ValidationException::withMessages([
                    'payroll_slip_id' => 'Lock periode gaji dulu sebelum menandai slip dibayar.',
                ]);
            }

            if ($slip->status !== PayrollSlipStatus::Paid) {
                $slip->forceFill([
                    'status' => PayrollSlipStatus::Paid,
                    'paid_at' => now(),
                ])->save();
            }

            $unpaidSlipExists = $slip->period->slips()
                ->where('status', '!=', PayrollSlipStatus::Paid->value)
                ->exists();

            if (! $unpaidSlipExists) {
                $slip->period->forceFill([
                    'status' => PayrollPeriodStatus::Paid,
                    'paid_at' => now(),
                ])->save();
            }

            return $slip->refresh()->load(['period', 'tailor']);
        });
    }
}
