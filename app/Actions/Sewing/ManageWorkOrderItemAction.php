<?php

namespace App\Actions\Sewing;

use App\Models\Article;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Services\Sewing\ArticleVariantResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Adds, re-plans, or removes a single line of an existing work order. */
class ManageWorkOrderItemAction
{
    public function __construct(private readonly ArticleVariantResolver $variants) {}

    /**
     * @param  array{article_id: int, color?: ?string, size?: ?string, planned_qty: int}  $data
     */
    public function add(WorkOrder $workOrder, array $data): WorkOrderItem
    {
        return DB::transaction(function () use ($workOrder, $data) {
            $article = Article::query()->findOrFail($data['article_id']);
            $variant = $this->variants->resolve($article, $data['color'] ?? null, $data['size'] ?? null);

            $existing = $workOrder->items()->where('article_variant_id', $variant->id)->lockForUpdate()->first();

            if ($existing) {
                $existing->increment('planned_qty', $data['planned_qty']);

                return $existing->refresh();
            }

            return $workOrder->items()->create([
                'article_id' => $article->id,
                'article_variant_id' => $variant->id,
                'color' => $variant->color,
                'size' => $variant->size,
                'planned_qty' => $data['planned_qty'],
            ]);
        });
    }

    public function updatePlannedQty(WorkOrderItem $item, int $plannedQty): WorkOrderItem
    {
        $item->forceFill(['planned_qty' => $plannedQty])->save();

        return $item;
    }

    public function remove(WorkOrderItem $item): void
    {
        DB::transaction(function () use ($item) {
            $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($item->id);

            if ($item->received_qty > 0) {
                throw ValidationException::withMessages([
                    'item' => 'Baris ini sudah ada hancaan masuk gudang, jadi tidak bisa dihapus.',
                ]);
            }

            $item->delete();
        });
    }
}
