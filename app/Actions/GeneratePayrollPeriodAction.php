<?php

namespace App\Actions;

use App\Enums\PayrollPeriodStatus;
use App\Enums\PayrollSlipStatus;
use App\Models\PayrollPeriod;
use App\Models\PayrollSlip;
use App\Models\TailorAssignmentCompletion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GeneratePayrollPeriodAction
{
    public function execute(PayrollPeriod $period): PayrollPeriod
    {
        return DB::transaction(function () use ($period) {
            $period = PayrollPeriod::query()->lockForUpdate()->findOrFail($period->id);

            if ($period->isLocked()) {
                throw ValidationException::withMessages([
                    'payroll_period_id' => 'Periode gaji sudah dikunci dan tidak bisa digenerate ulang.',
                ]);
            }

            $period->slips()->delete();

            $completions = TailorAssignmentCompletion::query()
                ->with(['tailor', 'productionArticle', 'workType'])
                ->whereBetween('completed_at', [
                    $period->starts_at->startOfDay(),
                    $period->ends_at->endOfDay(),
                ])
                ->orderBy('tailor_id')
                ->orderBy('completed_at')
                ->get();

            $totalTailors = 0;
            $totalCompletedQty = 0;
            $totalAmount = 0;

            foreach ($completions->groupBy('tailor_id') as $tailorId => $tailorCompletions) {
                /** @var \Illuminate\Support\Collection<int, TailorAssignmentCompletion> $tailorCompletions */
                $completedQty = $tailorCompletions->sum('completed_qty');
                $grossAmount = $tailorCompletions->sum('subtotal_amount');
                $netAmount = $grossAmount;

                $slip = PayrollSlip::create([
                    'payroll_period_id' => $period->id,
                    'tailor_id' => (int) $tailorId,
                    'invoice_number' => $this->invoiceNumber($period, (int) $tailorId),
                    'public_token' => Str::random(48),
                    'status' => PayrollSlipStatus::Draft,
                    'completed_qty' => $completedQty,
                    'gross_amount' => $grossAmount,
                    'bonus_amount' => 0,
                    'deduction_amount' => 0,
                    'net_amount' => $netAmount,
                    'generated_at' => now(),
                ]);

                foreach ($tailorCompletions as $completion) {
                    $slip->lines()->create([
                        'tailor_assignment_completion_id' => $completion->id,
                        'production_article_id' => $completion->production_article_id,
                        'work_type_id' => $completion->work_type_id,
                        'article_name' => $completion->productionArticle->article_name,
                        'color' => $completion->productionArticle->color,
                        'size' => $completion->productionArticle->size,
                        'work_type_name' => $completion->workType->name,
                        'completed_qty' => $completion->completed_qty,
                        'unit_rate_amount' => $completion->unit_rate_amount,
                        'subtotal_amount' => $completion->subtotal_amount,
                        'completed_at' => $completion->completed_at,
                        'notes' => $completion->notes,
                    ]);
                }

                $totalTailors++;
                $totalCompletedQty += $completedQty;
                $totalAmount += $netAmount;
            }

            $period->forceFill([
                'status' => PayrollPeriodStatus::Draft,
                'total_tailors' => $totalTailors,
                'total_completed_qty' => $totalCompletedQty,
                'total_amount' => $totalAmount,
                'generated_at' => now(),
            ])->save();

            return $period->load(['slips.tailor', 'slips.lines']);
        });
    }

    private function invoiceNumber(PayrollPeriod $period, int $tailorId): string
    {
        return 'INV-'.$period->starts_at->format('Ymd').'-'.$period->ends_at->format('Ymd').'-'.str_pad((string) $tailorId, 4, '0', STR_PAD_LEFT);
    }
}
