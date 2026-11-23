<?php

namespace App\Presenters;

use App\Models\Payout;
use App\Models\PayoutSlip;
use App\Models\PayoutSlipLine;
use App\Services\Sewing\PayoutSlipWhatsappService;

class PayoutPresenter
{
    public function __construct(private readonly PayoutSlipWhatsappService $whatsapp) {}

    /**
     * @return array<string, mixed>
     */
    public function summary(Payout $payout): array
    {
        return [
            'id' => $payout->id,
            'code' => $payout->code,
            'cutoff_date' => $payout->cutoff_date->toDateString(),
            'status' => $payout->status->value,
            'status_label' => $payout->status->label(),
            'is_draft' => $payout->isDraft(),
            'total_tailors' => $payout->total_tailors,
            'total_qty' => $payout->total_qty,
            'total_amount' => $payout->total_amount,
            'generated_at' => $payout->generated_at?->format('Y-m-d H:i'),
            'paid_at' => $payout->paid_at?->format('Y-m-d H:i'),
            'notes' => $payout->notes,
            'needs_hr_approval' => Payout::requiresHrApproval(),
            'hr_status' => $payout->hr_status,
            'hr_status_label' => $payout->hrStatusLabel(),
            'hr_submitted_at' => $payout->hr_submitted_at?->format('Y-m-d H:i'),
            'hr_decided_at' => $payout->hr_decided_at?->format('Y-m-d H:i'),
            'hr_decided_by' => $payout->hr_decided_by,
            'hr_note' => $payout->hr_note,
            'is_locked_by_hr' => $payout->isLockedByHr(),
            'can_be_paid' => $payout->canBePaid(),
            'slips_count' => (int) ($payout->slips_count ?? $payout->slips->count()),
            'paid_slips_count' => (int) ($payout->paid_slips_count ?? 0),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function slip(PayoutSlip $slip, bool $withLines = true): array
    {
        return [
            'id' => $slip->id,
            'invoice_number' => $slip->invoice_number,
            'tailor_id' => $slip->tailor_id,
            'tailor_name' => $slip->tailor->name,
            'tailor_code' => $slip->tailor->code,
            'status' => $slip->status->value,
            'status_label' => $slip->status->label(),
            'is_paid' => $slip->isPaid(),
            'is_locked' => (bool) $slip->payout?->isLockedByHr(),
            'can_pay' => ! $slip->isPaid() && (bool) $slip->payout?->canBePaid(),
            'qty' => $slip->qty,
            'gross_amount' => $slip->gross_amount,
            'bonus_amount' => $slip->bonus_amount,
            'deduction_amount' => $slip->deduction_amount,
            'kasbon_warung_amount' => $slip->kasbon_warung_amount,
            'kasbon_mingguan_amount' => $slip->kasbon_mingguan_amount,
            'net_amount' => $slip->net_amount,
            'notes' => $slip->notes,
            'paid_at' => $slip->paid_at?->format('Y-m-d H:i'),
            'whatsapp_url' => $this->whatsapp->url($slip),
            'public_url' => $this->whatsapp->publicUrl($slip),
            'lines' => $withLines ? $slip->lines->sortBy('occurred_at')->values()->map(fn (PayoutSlipLine $line) => [
                'id' => $line->id,
                'type' => $line->type->value,
                'type_label' => $line->type->label(),
                'description' => $line->description,
                'color' => $line->color,
                'size' => $line->size,
                'qty' => $line->qty,
                'rate' => $line->rate,
                'subtotal' => $line->subtotal,
                'occurred_at' => $line->occurred_at->format('Y-m-d H:i'),
            ]) : [],
        ];
    }
}
