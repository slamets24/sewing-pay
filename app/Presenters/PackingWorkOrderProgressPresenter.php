<?php

namespace App\Presenters;

use App\Enums\TailorType;
use App\Enums\WorkOrderItemStage;
use App\Models\PickupItem;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Support\Collection;

/** Bentuk data progres produksi yang dibaca packingv2 untuk WO Produksi. */
class PackingWorkOrderProgressPresenter
{
    /**
     * @return array<string, mixed>
     */
    public function summary(WorkOrder $workOrder): array
    {
        $items = $workOrder->items;
        $locations = $this->sewingLocations($items);

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
        $totals['sewing_makloon'] = min($totals['sewing'], array_sum($locations));
        $totals['sewing_internal'] = $totals['sewing'] - $totals['sewing_makloon'];

        $stage = $this->overallStage($workOrder, $totals);

        return [
            'sweing_pay_work_order_id' => $workOrder->id,
            'number' => $workOrder->number,
            'packing_production_order_id' => $workOrder->packing_production_order_id,
            'due_at' => $workOrder->due_at?->toDateString(),
            'is_overdue' => $workOrder->isOverdue(),
            'is_done' => $workOrder->isDone(),
            'stage' => $stage->value,
            'stage_label' => $this->stageLabel($stage, $locations),
            'sewing_locations' => $this->locationRows($totals['sewing_internal'], $locations),
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
        $locations = $this->sewingLocations(collect([$item]));
        $sewing = $item->sewingQty();
        $sewingMakloon = min($sewing, array_sum($locations));
        $sewingInternal = $sewing - $sewingMakloon;
        $stage = $item->stage();

        if ($stage === WorkOrderItemStage::Sewing) {
            $stage = $sewingMakloon > $sewingInternal ? WorkOrderItemStage::MakloonSewing : WorkOrderItemStage::InternalSewing;
        }

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
            'sewing' => $sewing,
            'sewing_internal' => $sewingInternal,
            'sewing_makloon' => $sewingMakloon,
            'sewing_locations' => $this->locationRows($sewingInternal, $locations),
            'waiting_revision' => $item->holdQty(),
            'delivered' => $item->delivered_qty,
            'qc_shipped' => $item->qcShippedQty(),
            'stage' => $stage->value,
            'stage_label' => $this->stageLabel($stage, $locations),
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
            WorkOrderItemStage::InternalSewing->value => $totals['sewing_internal'],
            WorkOrderItemStage::MakloonSewing->value => $totals['sewing_makloon'],
            WorkOrderItemStage::WaitingRevision->value => $totals['waiting_revision'],
        ];

        arsort($buckets);
        $top = array_key_first($buckets);

        return $buckets[$top] > 0 ? WorkOrderItemStage::from($top) : WorkOrderItemStage::Printing;
    }

    /**
     * Qty yang sedang dijahit vendor makloon (ambilan belum disetor), per nama vendor.
     *
     * @param  Collection<int, WorkOrderItem>  $items
     * @return array<string, int>
     */
    private function sewingLocations(Collection $items): array
    {
        $makloon = [];

        foreach ($items as $item) {
            if (! $item->relationLoaded('pickupItems')) {
                $item->load('pickupItems.tailor');
            }

            $item->pickupItems
                ->filter(fn (PickupItem $pickupItem) => $pickupItem->isOpen() && $pickupItem->tailor?->type === TailorType::Makloon)
                ->each(function (PickupItem $pickupItem) use (&$makloon): void {
                    $name = $pickupItem->tailor->name;
                    $makloon[$name] = ($makloon[$name] ?? 0) + $pickupItem->remainingQty();
                });
        }

        arsort($makloon);

        return array_filter($makloon);
    }

    /**
     * @param  array<string, int>  $makloon
     * @return list<array{type: string, name: string, qty: int}>
     */
    private function locationRows(int $internalQty, array $makloon): array
    {
        $rows = [];

        if ($internalQty > 0) {
            $rows[] = ['type' => 'internal', 'name' => 'Penjahit internal', 'qty' => $internalQty];
        }

        foreach ($makloon as $name => $qty) {
            $rows[] = ['type' => 'makloon', 'name' => (string) $name, 'qty' => $qty];
        }

        return $rows;
    }

    /**
     * @param  array<string, int>  $makloon
     */
    private function stageLabel(WorkOrderItemStage $stage, array $makloon): string
    {
        return match ($stage) {
            WorkOrderItemStage::InternalSewing => 'Di penjahit internal',
            WorkOrderItemStage::MakloonSewing => 'Di makloon jahit'.($makloon === [] ? '' : ': '.$this->vendorNames(array_keys($makloon))),
            default => $stage->label(),
        };
    }

    /**
     * @param  list<string>  $names
     */
    private function vendorNames(array $names): string
    {
        return count($names) <= 2
            ? implode(', ', $names)
            : $names[0].' +'.(count($names) - 1).' vendor';
    }
}
