<?php

namespace App\Presenters;

use App\Enums\WorkOrderItemStage;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;

/** Bentuk data progres produksi yang dibaca packingv2 untuk WO Produksi. */
class PackingWorkOrderProgressPresenter
{
    /**
     * @return array<string, mixed>
     */
    public function summary(WorkOrder $workOrder): array
    {
        $items = $workOrder->items;

        $totals = [
            'planned' => (int) $items->sum('planned_qty'),
            'printing' => (int) $items->sum(fn (WorkOrderItem $item) => $item->printingQty()),
            'cutting' => (int) $items->sum(fn (WorkOrderItem $item) => $item->cuttingPendingQty()),
            'ready' => (int) $items->sum(fn (WorkOrderItem $item) => $item->availableQty()),
            'sewing' => (int) $items->sum(fn (WorkOrderItem $item) => $item->sewingQty()),
            'waiting_revision' => (int) $items->sum(fn (WorkOrderItem $item) => $item->holdQty()),
            'delivered' => (int) $items->sum('delivered_qty'),
            'qc_shipped' => (int) $items->sum(fn (WorkOrderItem $item) => $item->qcShippedQty()),
        ];

        $stage = $this->overallStage($workOrder, $totals);

        return [
            'sweing_pay_work_order_id' => $workOrder->id,
            'number' => $workOrder->number,
            'packing_production_order_id' => $workOrder->packing_production_order_id,
            'due_at' => $workOrder->due_at?->toDateString(),
            'is_overdue' => $workOrder->isOverdue(),
            'is_done' => $workOrder->isDone(),
            'stage' => $stage->value,
            'stage_label' => $stage->label(),
            'progress_percent' => $totals['planned'] > 0
                ? (int) min(100, round($totals['delivered'] / $totals['planned'] * 100))
                : 0,
            'totals' => $totals,
            'synced_at' => $workOrder->packing_synced_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function detail(WorkOrder $workOrder): array
    {
        return [
            ...$this->summary($workOrder),
            'items' => $workOrder->items
                ->map(fn (WorkOrderItem $item) => $this->item($item))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function item(WorkOrderItem $item): array
    {
        $stage = $item->stage();

        return [
            'packing_item_id' => $item->packing_production_order_item_id,
            'article' => $item->article?->displayName() ?? '-',
            'color' => $item->color,
            'size' => $item->size,
            'item_type' => $item->item_type,
            'planned' => $item->planned_qty,
            'printing' => $item->printingQty(),
            'cutting' => $item->cuttingPendingQty(),
            'ready' => $item->availableQty(),
            'sewing' => $item->sewingQty(),
            'waiting_revision' => $item->holdQty(),
            'delivered' => $item->delivered_qty,
            'qc_shipped' => $item->qcShippedQty(),
            'stage' => $stage->value,
            'stage_label' => $stage->label(),
        ];
    }

    /**
     * Tahap yang paling banyak menahan qty, supaya satu label cukup mewakili WO.
     *
     * @param  array<string, int>  $totals
     */
    private function overallStage(WorkOrder $workOrder, array $totals): WorkOrderItemStage
    {
        if ($workOrder->isDone()) {
            return WorkOrderItemStage::Done;
        }

        $buckets = [
            WorkOrderItemStage::Printing->value => $totals['printing'],
            WorkOrderItemStage::Cutting->value => $totals['cutting'],
            WorkOrderItemStage::Ready->value => $totals['ready'],
            WorkOrderItemStage::Sewing->value => $totals['sewing'],
            WorkOrderItemStage::WaitingRevision->value => $totals['waiting_revision'],
        ];

        arsort($buckets);
        $top = array_key_first($buckets);

        return $buckets[$top] > 0 ? WorkOrderItemStage::from($top) : WorkOrderItemStage::Printing;
    }
}
