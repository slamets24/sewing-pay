<?php

namespace App\Actions;

use App\Enums\ProductionArticleStatus;
use App\Enums\TailorAssignmentStatus;
use App\Models\ProductionArticle;
use App\Models\TailorAssignment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelTailorAssignmentAction
{
    /**
     * Cancel a pickup that has no completed qty yet and return its qty to the article stock.
     */
    public function execute(TailorAssignment $assignment, ?int $cancelledBy = null): void
    {
        DB::transaction(function () use ($assignment, $cancelledBy) {
            $assignment = TailorAssignment::query()->lockForUpdate()->findOrFail($assignment->id);

            if ($assignment->status === TailorAssignmentStatus::Cancelled) {
                throw ValidationException::withMessages([
                    'assignment' => 'Pengambilan ini sudah dibatalkan.',
                ]);
            }

            if ($assignment->completed_qty > 0 || $assignment->completions()->exists()) {
                throw ValidationException::withMessages([
                    'assignment' => 'Pengambilan yang sudah ada qty selesai tidak bisa dibatalkan.',
                ]);
            }

            $article = ProductionArticle::query()->lockForUpdate()->findOrFail($assignment->production_article_id);
            $articleAssignedQty = max(0, $article->assigned_qty - $assignment->assigned_qty);

            $assignment->forceFill([
                'status' => TailorAssignmentStatus::Cancelled,
                'cancelled_at' => now(),
                'cancelled_by' => $cancelledBy,
            ])->save();

            $article->forceFill([
                'available_qty' => $article->available_qty + $assignment->assigned_qty,
                'assigned_qty' => $articleAssignedQty,
                'status' => $article->completed_qty >= $article->planned_qty
                    ? ProductionArticleStatus::Completed
                    : ($articleAssignedQty > 0 ? ProductionArticleStatus::InProgress : ProductionArticleStatus::Ready),
            ])->save();
        });
    }
}
