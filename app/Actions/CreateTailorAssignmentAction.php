<?php

namespace App\Actions;

use App\Enums\ProductionArticleStatus;
use App\Enums\TailorAssignmentStatus;
use App\Models\ProductionArticle;
use App\Models\Tailor;
use App\Models\TailorAssignment;
use App\Models\WorkType;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateTailorAssignmentAction
{
    /**
     * @param  array{tailor_id:int,production_article_id:int,assigned_qty:int,assigned_at?:string|null,due_at?:string|null,notes?:string|null,created_by?:int|null}  $data
     */
    public function execute(array $data): TailorAssignment
    {
        return DB::transaction(function () use ($data) {
            $tailor = Tailor::query()->lockForUpdate()->findOrFail($data['tailor_id']);

            if (! $tailor->is_active) {
                throw ValidationException::withMessages([
                    'tailor_id' => 'Penjahit tidak aktif.',
                ]);
            }

            $article = ProductionArticle::query()
                ->with('workType')
                ->lockForUpdate()
                ->findOrFail($data['production_article_id']);

            if ($article->status === ProductionArticleStatus::Cancelled || $article->status === ProductionArticleStatus::Completed) {
                throw ValidationException::withMessages([
                    'production_article_id' => 'Hancaan ini tidak bisa diambil.',
                ]);
            }

            if ($data['assigned_qty'] > $article->available_qty) {
                throw ValidationException::withMessages([
                    'assigned_qty' => 'Qty diambil melebihi qty tersedia.',
                ]);
            }

            /** @var WorkType $workType */
            $workType = $article->workType;

            if (! $workType->is_active) {
                throw ValidationException::withMessages([
                    'production_article_id' => 'Tarif hancaan ini tidak aktif.',
                ]);
            }

            $assignment = TailorAssignment::create([
                'tailor_id' => $tailor->id,
                'production_article_id' => $article->id,
                'work_type_id' => $workType->id,
                'created_by' => $data['created_by'] ?? null,
                'assigned_qty' => $data['assigned_qty'],
                'completed_qty' => 0,
                'defect_qty' => 0,
                'revision_qty' => 0,
                'unit_rate_amount' => $workType->rate_amount,
                'status' => TailorAssignmentStatus::InProgress,
                'assigned_at' => $data['assigned_at'] ?? now(),
                'due_at' => $data['due_at'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $article->forceFill([
                'available_qty' => $article->available_qty - $assignment->assigned_qty,
                'assigned_qty' => $article->assigned_qty + $assignment->assigned_qty,
                'status' => ProductionArticleStatus::InProgress,
            ])->save();

            return $assignment->load(['tailor', 'productionArticle', 'workType']);
        });
    }
}
