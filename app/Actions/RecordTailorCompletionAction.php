<?php

namespace App\Actions;

use App\Enums\PayrollPeriodStatus;
use App\Enums\ProductionArticleStatus;
use App\Enums\TailorAssignmentStatus;
use App\Models\PayrollPeriod;
use App\Models\TailorAssignment;
use App\Models\TailorAssignmentCompletion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class RecordTailorCompletionAction
{
    /**
     * @param  array{completed_qty:int,completed_at?:string|null,defect_qty?:int|null,revision_qty?:int|null,notes?:string|null,created_by?:int|null}  $data
     */
    public function execute(TailorAssignment $assignment, array $data): TailorAssignmentCompletion
    {
        return DB::transaction(function () use ($assignment, $data) {
            $assignment = TailorAssignment::query()
                ->with('productionArticle')
                ->lockForUpdate()
                ->findOrFail($assignment->id);

            if (in_array($assignment->status, [TailorAssignmentStatus::Completed, TailorAssignmentStatus::Cancelled], true)) {
                throw ValidationException::withMessages([
                    'tailor_assignment_id' => 'Assignment ini sudah tidak bisa ditambah penyelesaian.',
                ]);
            }

            $completedAt = isset($data['completed_at']) && $data['completed_at']
                ? Carbon::parse($data['completed_at'])
                : now();

            $lockedPeriodExists = PayrollPeriod::query()
                ->whereIn('status', [PayrollPeriodStatus::Locked->value, PayrollPeriodStatus::Paid->value])
                ->whereDate('starts_at', '<=', $completedAt)
                ->whereDate('ends_at', '>=', $completedAt)
                ->exists();

            if ($lockedPeriodExists) {
                throw ValidationException::withMessages([
                    'completed_at' => 'Tanggal selesai masuk periode gaji yang sudah dikunci.',
                ]);
            }

            $remainingQty = $assignment->assigned_qty - $assignment->completed_qty;

            if ($data['completed_qty'] > $remainingQty) {
                throw ValidationException::withMessages([
                    'completed_qty' => 'Qty selesai melebihi sisa assignment.',
                ]);
            }

            $completion = TailorAssignmentCompletion::create([
                'tailor_assignment_id' => $assignment->id,
                'tailor_id' => $assignment->tailor_id,
                'production_article_id' => $assignment->production_article_id,
                'work_type_id' => $assignment->work_type_id,
                'created_by' => $data['created_by'] ?? null,
                'completed_qty' => $data['completed_qty'],
                'defect_qty' => $data['defect_qty'] ?? 0,
                'revision_qty' => $data['revision_qty'] ?? 0,
                'unit_rate_amount' => $assignment->unit_rate_amount,
                'subtotal_amount' => $data['completed_qty'] * $assignment->unit_rate_amount,
                'completed_at' => $completedAt,
                'notes' => $data['notes'] ?? null,
            ]);

            $newCompletedQty = $assignment->completed_qty + $completion->completed_qty;
            $newStatus = $newCompletedQty >= $assignment->assigned_qty
                ? TailorAssignmentStatus::Completed
                : TailorAssignmentStatus::Partial;

            $assignment->forceFill([
                'completed_qty' => $newCompletedQty,
                'status' => $newStatus,
            ])->save();

            $article = $assignment->productionArticle;
            $articleCompletedQty = $article->completed_qty + $completion->completed_qty;
            $articleStatus = $articleCompletedQty >= $article->planned_qty
                ? ProductionArticleStatus::Completed
                : ProductionArticleStatus::InProgress;

            $article->forceFill([
                'completed_qty' => $articleCompletedQty,
                'status' => $articleStatus,
            ])->save();

            return $completion->load(['assignment', 'tailor', 'productionArticle', 'workType']);
        });
    }
}
