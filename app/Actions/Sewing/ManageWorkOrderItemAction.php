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
            $itemType = in_array($data['item_type'] ?? null, ['print', 'polosan'], true) ? $data['item_type'] : 'print';

            if ($existing) {
                $existing->increment('planned_qty', $data['planned_qty']);
                if ($existing->isPolosan()) {
                    $existing->increment('cutting_qty', $data['planned_qty']);
                }

                return $existing->refresh();
            }

            return $workOrder->items()->create([
                'article_id' => $article->id,
                'article_variant_id' => $variant->id,
                'color' => $variant->color,
                'size' => $variant->size,
                'item_type' => $itemType,
                'planned_qty' => $data['planned_qty'],
                'cutting_qty' => $itemType === 'polosan' ? $data['planned_qty'] : 0,
            ]);
        });
    }

    public function updatePlannedQty(WorkOrderItem $item, int $plannedQty): WorkOrderItem
    {
        $payload = ['planned_qty' => $plannedQty];
        if ($item->isPolosan()) {
            $payload['cutting_qty'] = $plannedQty;
        }

        $item->forceFill($payload)->save();

        return $item;
    }

    public function remove(WorkOrderItem $item): void
    {
        DB::transaction(function () use ($item) {
            $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($item->id);

            if ($item->received_qty > 0 || (! $item->isPolosan() && $item->cutting_qty > 0)) {
                throw ValidationException::withMessages([
                    'item' => 'Baris ini sudah mulai diproses (di cutting atau di gudang), jadi tidak bisa dihapus.',
                ]);
            }

            $item->delete();
        });
    }
}
