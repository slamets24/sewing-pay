<?php

namespace App\Actions\Sewing;

use App\Enums\PayoutStatus;
use App\Models\Payout;
use App\Models\PayoutSlip;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Bonus/deduction edits and paying slips; the pay run closes when its last slip is paid. */
class ManagePayoutSlipAction
{
    /**
     * @param  array{bonus_amount: int, deduction_amount: int, notes?: ?string}  $data
     */
    public function adjust(PayoutSlip $slip, array $data): PayoutSlip
    {
        return DB::transaction(function () use ($slip, $data) {
            $slip = PayoutSlip::query()->lockForUpdate()->findOrFail($slip->id);

            if ($slip->isPaid()) {
                throw ValidationException::withMessages(['payout_slip' => 'Slip yang sudah dibayar tidak bisa diubah.']);
            }

            $net = $slip->gross_amount + (int) $data['bonus_amount'] - (int) $data['deduction_amount'];

            if ($net < 0) {
                throw ValidationException::withMessages(['deduction_amount' => 'Potongan tidak boleh melebihi gaji kotor ditambah bonus.']);
            }

            $slip->forceFill([
                'bonus_amount' => (int) $data['bonus_amount'],
                'deduction_amount' => (int) $data['deduction_amount'],
                'net_amount' => $net,
                'notes' => $data['notes'] ?? null,
            ])->save();

            $this->refreshTotals($slip->payout_id);

            return $slip;
        });
    }

    public function markPaid(PayoutSlip $slip): PayoutSlip
    {
        return DB::transaction(function () use ($slip) {
            $slip = PayoutSlip::query()->lockForUpdate()->findOrFail($slip->id);

            if (! $slip->isPaid()) {
                $slip->forceFill(['status' => PayoutStatus::Paid, 'paid_at' => now()])->save();
            }

            $payout = Payout::query()->lockForUpdate()->findOrFail($slip->payout_id);

            if ($payout->slips()->where('status', '!=', PayoutStatus::Paid->value)->doesntExist()) {
                $payout->forceFill(['status' => PayoutStatus::Paid, 'paid_at' => now()])->save();
            }

            return $slip;
        });
    }

    public function markAllPaid(Payout $payout): void
    {
        DB::transaction(function () use ($payout) {
            if ($payout->slips()->doesntExist()) {
                throw ValidationException::withMessages(['payout' => 'Pencairan ini belum punya slip.']);
            }

            $payout->slips()->where('status', '!=', PayoutStatus::Paid->value)->get()->each(fn (PayoutSlip $slip) => $this->markPaid($slip));
        });
    }

    public function deleteDraft(Payout $payout): void
    {
        DB::transaction(function () use ($payout) {
            $payout = Payout::query()->lockForUpdate()->findOrFail($payout->id);

            if (! $payout->isDraft() || $payout->slips()->where('status', PayoutStatus::Paid->value)->exists()) {
                throw ValidationException::withMessages(['payout' => 'Pencairan yang sudah ada slip dibayar tidak bisa dihapus.']);
            }

            $payout->delete();
        });
    }

    private function refreshTotals(int $payoutId): void
    {
        $payout = Payout::query()->lockForUpdate()->findOrFail($payoutId);
        $payout->forceFill(['total_amount' => (int) $payout->slips()->sum('net_amount')])->save();
    }
}
