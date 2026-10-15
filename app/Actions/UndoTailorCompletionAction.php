<?php

namespace App\Actions;

use App\Enums\ProductionArticleStatus;
use App\Enums\TailorAssignmentStatus;
use App\Models\PayrollPeriod;
use App\Models\ProductionArticle;
use App\Models\TailorAssignment;
use App\Models\TailorAssignmentCompletion;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UndoTailorCompletionAction
{
    /**
     * Remove a mistaken completion entry and roll its qty back out of the assignment and article.
     */
    public function execute(TailorAssignmentCompletion $completion): void
    {
        DB::transaction(function () use ($completion) {
            $completion = TailorAssignmentCompletion::query()->lockForUpdate()->findOrFail($completion->id);

            if ($completion->payrollSlipLine()->exists()) {
                throw ValidationException::withMessages([
                    'completion' => 'Input ini sudah masuk slip gaji, jadi tidak bisa dibatalkan.',
                ]);
            }

            if (PayrollPeriod::lockedOn($completion->completed_at)) {
                throw ValidationException::withMessages([
                    'completion' => 'Input ini masuk periode gaji yang sudah dikunci.',
                ]);
            }

            $assignment = TailorAssignment::query()->lockForUpdate()->findOrFail($completion->tailor_assignment_id);
            $assignmentCompletedQty = max(0, $assignment->completed_qty - $completion->completed_qty);

            $assignment->forceFill([
                'completed_qty' => $assignmentCompletedQty,
                'status' => $assignmentCompletedQty > 0 ? TailorAssignmentStatus::Partial : TailorAssignmentStatus::InProgress,
            ])->save();

            $article = ProductionArticle::query()->lockForUpdate()->findOrFail($completion->production_article_id);
            $articleCompletedQty = max(0, $article->completed_qty - $completion->completed_qty);

            $article->forceFill([
                'completed_qty' => $articleCompletedQty,
                'status' => $articleCompletedQty >= $article->planned_qty
                    ? ProductionArticleStatus::Completed
                    : ProductionArticleStatus::InProgress,
            ])->save();

            $completion->delete();
        });
    }
}
