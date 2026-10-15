<?php

namespace App\Presenters;

use App\Models\PickupItem;
use App\Models\QcShipment;
use App\Models\Revision;
use App\Models\SewingDelivery;
use App\Models\Tailor;
use Illuminate\Support\Collection;

/**
 * Shapes the floor records: what tailors hold, what they delivered, QC shipments and revisions.
 * Callers eager-load `tailor` and `workOrderItem.{article,workOrder,variant}`.
 */
class ProductionPresenter
{
    /**
     * @return array<string, mixed>
     */
    public function tailor(Tailor $tailor): array
    {
        return [
            'id' => $tailor->id,
            'code' => $tailor->code,
            'name' => $tailor->name,
            'type' => $tailor->type->value,
            'type_label' => $tailor->type->label(),
            'whatsapp_number' => $tailor->whatsapp_number,
            'address' => $tailor->address,
            'is_active' => $tailor->is_active,
            'notes' => $tailor->notes,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function pickupItem(PickupItem $item): array
    {
        $workOrderItem = $item->workOrderItem;

        return [
            'id' => $item->id,
            'pickup_id' => $item->pickup_id,
            'tailor_id' => $item->tailor_id,
            'tailor_name' => $item->tailor->name,
            'tailor_type' => $item->tailor->type->value,
            'work_order_item_id' => $item->work_order_item_id,
            'work_order_number' => $workOrderItem->workOrder->number,
            'due_at' => $workOrderItem->workOrder->due_at?->toDateString(),
            'article_name' => $workOrderItem->article->name,
            'color' => $workOrderItem->color,
            'size' => $workOrderItem->size,
            'qty' => $item->qty,
            'delivered_qty' => $item->delivered_qty,
            'remaining_qty' => $item->remainingQty(),
            'sewing_rate' => $item->sewing_rate,
            'status' => $item->status->value,
            'status_label' => $item->status->label(),
            'picked_at' => $item->pickup->picked_at->format('Y-m-d H:i'),
            'age_days' => (int) $item->pickup->picked_at->startOfDay()->diffInDays(today()),
            'can_cancel' => $item->isCancellable(),
        ];
    }

    /**
     * Open pickup items grouped per tailor, busiest first.
     *
     * @param  Collection<int, PickupItem>  $items
     * @return list<array<string, mixed>>
     */
    public function board(Collection $items): array
    {
        return $items
            ->groupBy('tailor_id')
            ->map(fn (Collection $group) => [
                'tailor' => $this->tailor($group->first()->tailor),
                'remaining_qty' => (int) $group->sum(fn (PickupItem $item) => $item->remainingQty()),
                'items' => $group->map(fn (PickupItem $item) => $this->pickupItem($item))->values(),
            ])
            ->sortBy(fn (array $row) => $row['tailor']['name'])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function delivery(SewingDelivery $delivery): array
    {
        $workOrderItem = $delivery->workOrderItem;

        return [
            'id' => $delivery->id,
            'tailor_id' => $delivery->tailor_id,
            'tailor_name' => $delivery->tailor->name,
            'tailor_code' => $delivery->tailor->code,
            'work_order_item_id' => $delivery->work_order_item_id,
            'work_order_number' => $workOrderItem->workOrder->number,
            'article_name' => $workOrderItem->article->name,
            'color' => $workOrderItem->color,
            'size' => $workOrderItem->size,
            'barcode_value' => $workOrderItem->variant?->barcode_value,
            'qty' => $delivery->qty,
            'sewing_rate' => $delivery->sewing_rate,
            'subtotal' => $delivery->subtotal,
            'is_payable' => $delivery->is_payable,
            'delivered_at' => $delivery->delivered_at->format('Y-m-d H:i'),
            'qc_shipment_id' => $delivery->qc_shipment_id,
            'qc_shipment_number' => $delivery->shipment?->number,
            'can_undo' => ! $delivery->isShipped() && ! ($delivery->slip_line_exists ?? false) && ! ($delivery->revisions_exists ?? false),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function shipment(QcShipment $shipment): array
    {
        $deliveries = $shipment->deliveries;

        return [
            'id' => $shipment->id,
            'number' => $shipment->number,
            'sent_at' => $shipment->sent_at->format('Y-m-d H:i'),
            'notes' => $shipment->notes,
            'qty' => (int) $deliveries->sum('qty'),
            'deliveries_count' => $deliveries->count(),
            'created_by_name' => $shipment->creator?->name,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function revision(Revision $revision): array
    {
        $workOrderItem = $revision->workOrderItem;
        $next = $revision->nextStatus();

        return [
            'id' => $revision->id,
            'type' => $revision->type->value,
            'type_label' => $revision->type->label(),
            'status' => $revision->status->value,
            'status_label' => $revision->status->label(),
            'next_status_label' => $next?->label(),
            'found_at' => $revision->found_at->value,
            'found_at_label' => $revision->found_at->label(),
            'work_order_number' => $workOrderItem->workOrder->number,
            'article_name' => $workOrderItem->article->name,
            'color' => $workOrderItem->color,
            'size' => $workOrderItem->size,
            'part_name' => $revision->part_name,
            'material_type' => $revision->material_type,
            'tailor_id' => $revision->tailor_id,
            'tailor_name' => $revision->tailor->name,
            'qty' => $revision->qty,
            'rate' => $revision->rate,
            'subtotal' => $revision->subtotal,
            'reported_at' => $revision->reported_at->format('Y-m-d H:i'),
            'reported_by_name' => $revision->reporter?->name,
            'completed_at' => $revision->completed_at?->format('Y-m-d H:i'),
            'notes' => $revision->notes,
            'is_on_slip' => (bool) ($revision->slip_line_exists ?? false),
            'returned_to_warehouse' => $revision->returned_to_warehouse,
            'is_holding_stock' => $revision->isHoldingStock(),
            'can_change_tailor' => in_array($revision->status->value, ['waiting_material', 'material_ready'], true),
        ];
    }
}
