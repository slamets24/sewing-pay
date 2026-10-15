<?php

namespace App\Actions\Sewing;

use App\Enums\PickupItemStatus;
use App\Enums\RevisionFoundAt;
use App\Enums\RevisionType;
use App\Models\PickupItem;
use App\Models\Revision;
use App\Models\RevisionPart;
use App\Models\SewingDelivery;
use App\Models\Tailor;
use App\Models\WorkOrderItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Logs a revision. Sewing fixes are free and go back to the same tailor;
 * material fixes are paid per part and wait for replacement material first.
 *
 * A material defect found while sewing can either stay with the tailor, or be handed back:
 * then the pieces leave the tailor's hands and sit in the warehouse, blocked, until the material arrives.
 */
class ReportRevisionAction
{
    /**
     * @param  array{type: string, found_at: string, work_order_item_id?: ?int, sewing_delivery_id?: ?int, pickup_item_id?: ?int, return_to_warehouse?: bool, revision_part_id?: ?int, tailor_id?: ?int, qty: int, notes?: ?string}  $data
     */
    public function execute(array $data, ?int $reportedBy = null): Revision
    {
        return DB::transaction(function () use ($data, $reportedBy) {
            $type = RevisionType::from($data['type']);
            $foundAt = RevisionFoundAt::from($data['found_at']);
            $delivery = isset($data['sewing_delivery_id']) ? SewingDelivery::query()->findOrFail($data['sewing_delivery_id']) : null;
            $pickupItem = isset($data['pickup_item_id']) ? PickupItem::query()->lockForUpdate()->findOrFail($data['pickup_item_id']) : null;
            $item = WorkOrderItem::query()->findOrFail($delivery?->work_order_item_id ?? $pickupItem?->work_order_item_id ?? $data['work_order_item_id']);
            $tailor = Tailor::query()->findOrFail($data['tailor_id'] ?? $delivery?->tailor_id ?? $pickupItem?->tailor_id);
            $part = $type === RevisionType::Material ? $this->part($data['revision_part_id'] ?? null) : null;
            $returnToWarehouse = (bool) ($data['return_to_warehouse'] ?? false);

            if ($foundAt === RevisionFoundAt::Qc && ! $delivery?->isShipped()) {
                throw ValidationException::withMessages(['sewing_delivery_id' => 'Revisi dari QC harus untuk barang yang sudah dikirim ke QC.']);
            }

            if ($delivery && $data['qty'] > $delivery->qty) {
                throw ValidationException::withMessages(['qty' => "Qty revisi melebihi setoran ({$delivery->qty} pcs)."]);
            }

            if ($pickupItem && $data['qty'] > $pickupItem->remainingQty()) {
                throw ValidationException::withMessages(['qty' => "Penjahit hanya memegang {$pickupItem->remainingQty()} pcs barang ini."]);
            }

            if ($returnToWarehouse) {
                $this->handBack($pickupItem, $type, (int) $data['qty']);
            }

            $rate = $part && $tailor->isPaidHere() ? $part->price : 0;

            return Revision::create([
                'type' => $type,
                'status' => $type->initialStatus(),
                'found_at' => $foundAt,
                'work_order_item_id' => $item->id,
                'sewing_delivery_id' => $delivery?->id,
                'pickup_item_id' => $pickupItem?->id,
                'returned_to_warehouse' => $returnToWarehouse,
                'revision_part_id' => $part?->id,
                'part_name' => $part?->name,
                'material_type' => $part?->material_type,
                'tailor_id' => $tailor->id,
                'qty' => $data['qty'],
                'rate' => $rate,
                'subtotal' => $rate * $data['qty'],
                'reported_by' => $reportedBy,
                'reported_at' => now(),
                'started_at' => $type === RevisionType::Sewing ? now() : null,
                'notes' => $data['notes'] ?? null,
            ]);
        });
    }

    /** The tailor stops holding these pieces; they wait in the warehouse, not takeable, until the material arrives. */
    private function handBack(?PickupItem $pickupItem, RevisionType $type, int $qty): void
    {
        if (! $pickupItem || $type !== RevisionType::Material || ! $pickupItem->isOpen()) {
            throw ValidationException::withMessages(['return_to_warehouse' => 'Hanya revisi bahan dari barang yang sedang dijahit yang bisa dikembalikan ke gudang.']);
        }

        $pickupItem->qty -= $qty;

        if ($pickupItem->remainingQty() === 0) {
            $pickupItem->status = $pickupItem->delivered_qty > 0 ? PickupItemStatus::Done : PickupItemStatus::Cancelled;
            $pickupItem->cancelled_at = $pickupItem->delivered_qty > 0 ? null : now();
        }

        $pickupItem->save();

        $workOrderItem = WorkOrderItem::query()->lockForUpdate()->findOrFail($pickupItem->work_order_item_id);
        $workOrderItem->assigned_qty -= $qty;
        $workOrderItem->revision_hold_qty += $qty;
        $workOrderItem->save();
    }

    private function part(?int $partId): RevisionPart
    {
        if (! $partId) {
            throw ValidationException::withMessages(['revision_part_id' => 'Pilih bagian yang diganti.']);
        }

        return RevisionPart::query()->findOrFail($partId);
    }
}
