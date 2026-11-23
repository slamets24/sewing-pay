<?php

namespace App\Actions\Sewing;

use App\Models\Payout;
use App\Models\PayoutSlip;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Keputusan HR atas pencairan yang dikirim: acc atau dikembalikan, beserta bonus/kasbon/potongan per slip yang diubah HR.
 */
class ApplyHrPayoutDecisionAction
{
    /**
     * @param  array{decision: string, decided_by?: string|null, note?: string|null, slips?: list<array{opsew_slip_id: int, bonus_amount: int, kasbon_warung_amount: int, kasbon_mingguan_amount: int, deduction_amount: int, notes?: string|null}>}  $data
     */
    public function execute(Payout $payout, array $data): Payout
    {
        return DB::transaction(function () use ($payout, $data): Payout {
            $payout = Payout::query()->lockForUpdate()->findOrFail($payout->id);

            if ($payout->hr_status !== Payout::HR_SUBMITTED) {
                throw ValidationException::withMessages(['payout' => "Pencairan {$payout->code} tidak sedang menunggu acc HR."]);
            }

            $slips = PayoutSlip::query()->where('payout_id', $payout->id)->lockForUpdate()->get()->keyBy('id');

            foreach ($data['slips'] ?? [] as $row) {
                $slip = $slips->get((int) $row['opsew_slip_id']);

                if (! $slip || $slip->isPaid()) {
                    continue;
                }

                $net = $slip->gross_amount + (int) $row['bonus_amount'] - (int) $row['deduction_amount']
                    - (int) $row['kasbon_warung_amount'] - (int) $row['kasbon_mingguan_amount'];

                if ($net < 0) {
                    throw ValidationException::withMessages(['slips' => "Potongan slip {$slip->invoice_number} melebihi gaji kotor ditambah bonus."]);
                }

                $slip->forceFill([
                    'bonus_amount' => (int) $row['bonus_amount'],
                    'kasbon_warung_amount' => (int) $row['kasbon_warung_amount'],
                    'kasbon_mingguan_amount' => (int) $row['kasbon_mingguan_amount'],
                    'deduction_amount' => (int) $row['deduction_amount'],
                    'net_amount' => $net,
                    'notes' => array_key_exists('notes', $row) ? ($row['notes'] ?: null) : $slip->notes,
                ])->save();
            }

            $payout->forceFill([
                'hr_status' => $data['decision'] === 'approved' ? Payout::HR_APPROVED : Payout::HR_RETURNED,
                'hr_decided_at' => now(),
                'hr_decided_by' => $data['decided_by'] ?? null,
                'hr_note' => $data['note'] ?? null,
                'total_amount' => (int) PayoutSlip::query()->where('payout_id', $payout->id)->sum('net_amount'),
            ])->save();

            return $payout;
        });
    }
}
