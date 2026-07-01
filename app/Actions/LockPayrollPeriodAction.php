<?php

namespace App\Actions;

use App\Enums\PayrollPeriodStatus;
use App\Models\PayrollPeriod;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LockPayrollPeriodAction
{
    public function execute(PayrollPeriod $period): PayrollPeriod
    {
        return DB::transaction(function () use ($period) {
            $period = PayrollPeriod::query()->lockForUpdate()->findOrFail($period->id);

            if ($period->status === PayrollPeriodStatus::Paid) {
                throw ValidationException::withMessages([
                    'payroll_period_id' => 'Periode yang sudah dibayar tidak bisa dikunci ulang.',
                ]);
            }

            if (! $period->generated_at) {
                throw ValidationException::withMessages([
                    'payroll_period_id' => 'Generate payroll dulu sebelum mengunci periode.',
                ]);
            }

            $period->forceFill([
                'status' => PayrollPeriodStatus::Locked,
                'locked_at' => now(),
            ])->save();

            return $period;
        });
    }
}
