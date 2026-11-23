<?php

namespace App\Actions\Sewing;

use App\Enums\PayoutLineType;
use App\Models\Payout;
use App\Models\PayoutSlip;
use App\Services\Sewing\HrAzzahraClient;
use App\Services\Sewing\PayoutSlipWhatsappService;
use Illuminate\Validation\ValidationException;

/**
 * Kirim draft pencairan ke hr-azzahra untuk di-acc. Selama menunggu HR, angka slip dikunci di OPSEW.
 * HR bisa acc (boleh sambil mengubah bonus/kasbon/potongan) atau mengembalikan; keputusannya diterima lewat API.
 */
class SubmitPayoutToHrAction
{
    public function __construct(
        private readonly HrAzzahraClient $hr,
        private readonly PayoutSlipWhatsappService $slipLinks,
    ) {}

    public function execute(Payout $payout, ?string $submittedBy = null): Payout
    {
        $payout->load(['slips.tailor', 'slips.lines']);

        if (! $payout->isDraft() || $payout->isLockedByHr()) {
            throw ValidationException::withMessages(['payout' => 'Pencairan ini sudah dikirim ke HR atau sudah dibayar.']);
        }

        if ($payout->slips->isEmpty()) {
            throw ValidationException::withMessages(['payout' => 'Pencairan ini belum punya slip untuk dikirim.']);
        }

        try {
            $this->hr->submitPayout($this->payload($payout, $submittedBy));
        } catch (\Throwable $exception) {
            throw ValidationException::withMessages(['payout' => 'Gagal mengirim ke HR: '.$exception->getMessage()]);
        }

        $payout->forceFill([
            'hr_status' => Payout::HR_SUBMITTED,
            'hr_submitted_at' => now(),
            'hr_decided_at' => null,
            'hr_decided_by' => null,
            'hr_note' => null,
        ])->save();

        return $payout;
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Payout $payout, ?string $submittedBy): array
    {
        return [
            'opsew_payout_id' => $payout->id,
            'code' => $payout->code,
            'cutoff_date' => $payout->cutoff_date->toDateString(),
            'notes' => $payout->notes,
            'submitted_by' => $submittedBy,
            'slips' => $payout->slips->map(fn (PayoutSlip $slip): array => [
                'opsew_slip_id' => $slip->id,
                'invoice_number' => $slip->invoice_number,
                'tailor_name' => $slip->tailor->name,
                'tailor_code' => $slip->tailor->code,
                'hr_employee_id' => $slip->tailor->hr_employee_id,
                'employee_number' => $slip->tailor->hr_employee_number,
                'qty' => $slip->qty,
                'sewing_amount' => (int) $slip->lines->where('type', PayoutLineType::Sewing)->sum('subtotal'),
                'revision_amount' => (int) $slip->lines->where('type', PayoutLineType::Revision)->sum('subtotal'),
                'meal_allowance_amount' => (int) $slip->lines->where('type', PayoutLineType::MealAllowance)->sum('subtotal'),
                'gross_amount' => $slip->gross_amount,
                'bonus_amount' => $slip->bonus_amount,
                'kasbon_warung_amount' => $slip->kasbon_warung_amount,
                'kasbon_mingguan_amount' => $slip->kasbon_mingguan_amount,
                'deduction_amount' => $slip->deduction_amount,
                'net_amount' => $slip->net_amount,
                'notes' => $slip->notes,
                'public_url' => $this->slipLinks->publicUrl($slip),
            ])->values()->all(),
        ];
    }
}
