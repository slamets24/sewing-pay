<?php

namespace App\Presenters;

use App\Models\HancaanReceipt;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;

/** Shapes work orders and their lines for the Inertia pages. Expects `items.article` / `items.variant` loaded. */
class WorkOrderPresenter
{
    /**
     * @return array<string, mixed>
     */
    public function summary(WorkOrder $workOrder): array
    {
        $items = $workOrder->items;

        return [
            'id' => $workOrder->id,
            'number' => $workOrder->number,
            'channel' => $workOrder->channel,
            'category' => $workOrder->category,
            'ordered_at' => $workOrder->ordered_at?->toDateString(),
            'due_at' => $workOrder->due_at?->toDateString(),
            'is_opening_stock' => $workOrder->is_opening_stock,
            'is_overdue' => $workOrder->isOverdue(),
            'is_done' => $workOrder->isDone(),
            'notes' => $workOrder->notes,
            'items_count' => $items->count(),
            'article_names' => $items->map(fn (WorkOrderItem $item) => $item->article?->name)->filter()->unique()->values(),
            'planned_qty' => (int) $items->sum('planned_qty'),
            'pending_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->pendingQty()),
            'available_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->availableQty()),
            'sewing_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->sewingQty()),
            'hold_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->holdQty()),
            'delivered_qty' => (int) $items->sum('delivered_qty'),
            'can_delete' => ! $workOrder->hasReceivedAnything(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function detail(WorkOrder $workOrder): array
    {
        return [
            ...$this->summary($workOrder),
            'source_text' => $workOrder->source_text,
            'items' => $workOrder->items
                ->sortBy([['article.name', 'asc'], ['color', 'asc'], ['variant.size_sort', 'asc']])
                ->values()
                ->map(fn (WorkOrderItem $item) => $this->item($item)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function item(WorkOrderItem $item): array
    {
        $stage = $item->stage();

        return [
            'id' => $item->id,
            'work_order_id' => $item->work_order_id,
            'work_order_number' => $item->relationLoaded('workOrder') ? $item->workOrder->number : null,
            'due_at' => $item->relationLoaded('workOrder') ? $item->workOrder->due_at?->toDateString() : null,
            'article_id' => $item->article_id,
            'article_name' => $item->article->name,
            'color' => $item->color,
            'size' => $item->size,
            'barcode_value' => $item->variant?->barcode_value,
            'sewing_rate' => $item->article->sewing_rate,
            'planned_qty' => $item->planned_qty,
            'received_qty' => $item->received_qty,
            'assigned_qty' => $item->assigned_qty,
            'delivered_qty' => $item->delivered_qty,
            'pending_qty' => $item->pendingQty(),
            'available_qty' => $item->availableQty(),
            'sewing_qty' => $item->sewingQty(),
            'hold_qty' => $item->holdQty(),
            'stage' => $stage->value,
            'stage_label' => $stage->label(),
            'can_delete' => $item->received_qty === 0,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function receipt(HancaanReceipt $receipt): array
    {
        return [
            'id' => $receipt->id,
            'work_order_item_id' => $receipt->work_order_item_id,
            'article_name' => $receipt->item->article->name,
            'color' => $receipt->item->color,
            'size' => $receipt->item->size,
            'qty' => $receipt->qty,
            'received_at' => $receipt->received_at->format('Y-m-d H:i'),
            'notes' => $receipt->notes,
            'created_by_name' => $receipt->creator?->name,
        ];
    }
}
