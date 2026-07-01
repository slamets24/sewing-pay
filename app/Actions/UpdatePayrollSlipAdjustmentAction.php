<?php

namespace App\Actions;

use App\Enums\PayrollSlipStatus;
use App\Models\PayrollPeriod;
use App\Models\PayrollSlip;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdatePayrollSlipAdjustmentAction
{
    /**
     * @param  array{bonus_amount:int,deduction_amount:int,notes?:string|null}  $data
     */
    public function execute(PayrollSlip $slip, array $data): PayrollSlip
    {
        return DB::transaction(function () use ($slip, $data) {
            $slip = PayrollSlip::query()
                ->lockForUpdate()
                ->findOrFail($slip->id);

            if ($slip->status === PayrollSlipStatus::Paid) {
                throw ValidationException::withMessages([
                    'payroll_slip_id' => 'Slip yang sudah dibayar tidak bisa diubah.',
                ]);
            }

            $bonusAmount = (int) $data['bonus_amount'];
            $deductionAmount = (int) $data['deduction_amount'];
            $netAmount = $slip->gross_amount + $bonusAmount - $deductionAmount;

            if ($netAmount < 0) {
                throw ValidationException::withMessages([
                    'deduction_amount' => 'Potongan tidak boleh melebihi gaji kotor ditambah bonus.',
                ]);
            }

            $slip->forceFill([
                'bonus_amount' => $bonusAmount,
                'deduction_amount' => $deductionAmount,
                'net_amount' => $netAmount,
                'notes' => $data['notes'] ?? null,
            ])->save();

            $period = PayrollPeriod::query()
                ->lockForUpdate()
                ->findOrFail($slip->payroll_period_id);

            $period->forceFill([
                'total_amount' => $period->slips()->sum('net_amount'),
            ])->save();

            return $slip->refresh()->load(['period', 'tailor']);
        });
    }
}
