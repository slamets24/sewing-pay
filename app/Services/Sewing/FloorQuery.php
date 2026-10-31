<?php

namespace App\Services\Sewing;

use App\Enums\PickupItemStatus;
use App\Enums\RevisionStatus;
use App\Models\PickupItem;
use App\Models\Revision;
use App\Models\SewingDelivery;
use App\Models\WorkOrderItem;
use Illuminate\Database\Eloquent\Collection;

/** Shared read queries for the workshop floor, with the relations the presenters need. */
class FloorQuery
{
    /**
     * @return Collection<int, PickupItem>
     */
    public function openPickupItems(?int $tailorId = null): Collection
    {
        return PickupItem::query()
            ->with(['tailor', 'pickup', 'workOrderItem.article', 'workOrderItem.workOrder', 'revisions'])
            ->where('status', PickupItemStatus::Open->value)
            ->when($tailorId, fn ($query) => $query->where('tailor_id', $tailorId))
            ->oldest('id')
            ->get();
    }

    /**
     * Warehouse lines a tailor can take right now, oldest due date first.
     *
     * @return Collection<int, WorkOrderItem>
     */
    public function availableItems(): Collection
    {
        return WorkOrderItem::query()
            ->with(['article', 'workOrder', 'variant'])
            ->whereRaw('received_qty > assigned_qty + revision_hold_qty')
            ->get()
            ->sortBy([
                fn (WorkOrderItem $a, WorkOrderItem $b) => ($a->workOrder->due_at?->timestamp ?? PHP_INT_MAX) <=> ($b->workOrder->due_at?->timestamp ?? PHP_INT_MAX),
                fn (WorkOrderItem $a, WorkOrderItem $b) => [$a->article->name, $a->color, $a->size] <=> [$b->article->name, $b->color, $b->size],
            ])
            ->values();
    }

    /**
     * @return Collection<int, SewingDelivery>
     */
    public function recentDeliveries(int $limit = 30, ?int $tailorId = null): Collection
    {
        return $this->deliveries()
            ->when($tailorId, fn ($query) => $query->where('tailor_id', $tailorId))
            ->latest('delivered_at')
            ->latest('id')
            ->limit($limit)
            ->get();
    }

    /**
     * @return Collection<int, SewingDelivery>
     */
    public function unshippedDeliveries(): Collection
    {
        return $this->deliveries()->whereNull('qc_shipment_id')->oldest('delivered_at')->get();
    }

    /**
     * Goods already handed to QC (another division); QC reports revisions against these.
     *
     * @return Collection<int, SewingDelivery>
     */
    public function shippedDeliveries(int $limit = 300): Collection
    {
        return $this->deliveries()->whereNotNull('qc_shipment_id')->latest('qc_shipment_id')->latest('id')->limit($limit)->get();
    }

    /**
     * @return Collection<int, Revision>
     */
    public function openRevisions(?int $tailorId = null): Collection
    {
        return $this->revisions()
            ->where('status', '!=', RevisionStatus::Done->value)
            ->when($tailorId, fn ($query) => $query->where('tailor_id', $tailorId))
            ->oldest('reported_at')
            ->get();
    }

    public function deliveries()
    {
        return SewingDelivery::query()
            ->with(['tailor', 'shipment', 'workOrderItem.article', 'workOrderItem.workOrder', 'workOrderItem.variant'])
            ->withExists(['slipLine', 'revisions']);
    }

    public function revisions()
    {
        return Revision::query()
            ->with(['tailor', 'reporter', 'workOrderItem.article', 'workOrderItem.workOrder'])
            ->withExists('slipLine');
    }
}
