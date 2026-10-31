<?php

namespace App\Actions\Sewing;

use App\Enums\PickupItemStatus;
use App\Enums\RevisionStatus;
use App\Models\PickupItem;
use App\Models\Revision;
use App\Models\SewingDelivery;
use App\Models\WorkOrderItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** A tailor hands back sewn pieces ("setor"); for internal tailors it is payable right away. */
class RecordDeliveryAction
{
    public function execute(PickupItem $pickupItem, int $qty, ?string $deliveredAt = null, ?string $notes = null, ?int $createdBy = null): SewingDelivery
    {
        return DB::transaction(function () use ($pickupItem, $qty, $deliveredAt, $notes, $createdBy) {
            $pickupItem = PickupItem::query()->with('tailor')->lockForUpdate()->findOrFail($pickupItem->id);

            if (! $pickupItem->isOpen()) {
                throw ValidationException::withMessages(['qty' => 'Pengambilan ini sudah selesai atau dibatalkan.']);
            }

            if ($qty > $pickupItem->deliverableQty()) {
                $revQty = $pickupItem->blockedRevisionQty();
                $msg = $revQty > 0
                    ? "Hanya {$pickupItem->deliverableQty()} pcs yang siap disetor ({$revQty} pcs masih menunggu bahan revisi)."
                    : "Sisa yang dipegang penjahit hanya {$pickupItem->remainingQty()} pcs.";
                throw ValidationException::withMessages(['qty' => $msg]);
            }

            $isPayable = $pickupItem->tailor->isPaidHere();

            $delivery = SewingDelivery::create([
                'pickup_item_id' => $pickupItem->id,
                'tailor_id' => $pickupItem->tailor_id,
                'work_order_item_id' => $pickupItem->work_order_item_id,
                'qty' => $qty,
                'sewing_rate' => $pickupItem->sewing_rate,
                'subtotal' => $isPayable ? $qty * $pickupItem->sewing_rate : 0,
                'is_payable' => $isPayable,
                'delivered_at' => $deliveredAt ? Carbon::parse($deliveredAt) : now(),
                'notes' => $notes,
                'created_by' => $createdBy,
            ]);

            $pickupItem->delivered_qty += $qty;
            $pickupItem->status = $pickupItem->remainingQty() === 0 ? PickupItemStatus::Done : PickupItemStatus::Open;
            $pickupItem->save();

            WorkOrderItem::query()->lockForUpdate()->findOrFail($pickupItem->work_order_item_id)->increment('delivered_qty', $qty);

            $inProgressRevisions = Revision::query()
                ->where('status', RevisionStatus::InProgress->value)
                ->where(function ($q) use ($pickupItem) {
                    $q->where('pickup_item_id', $pickupItem->id)
                        ->orWhere(function ($sub) use ($pickupItem) {
                            $sub->where('tailor_id', $pickupItem->tailor_id)
                                ->where('work_order_item_id', $pickupItem->work_order_item_id)
                                ->whereNull('pickup_item_id');
                        });
                })
                ->oldest('started_at')
                ->lockForUpdate()
                ->get();

            $remainingDeliverQty = $qty;
            foreach ($inProgressRevisions as $rev) {
                if ($remainingDeliverQty <= 0) {
                    break;
                }
                $rev->status = RevisionStatus::Done;
                $rev->completed_at = $deliveredAt ? Carbon::parse($deliveredAt) : now();
                if (! $rev->pickup_item_id) {
                    $rev->pickup_item_id = $pickupItem->id;
                }
                $rev->save();
                $remainingDeliverQty -= $rev->qty;
            }

            return $delivery;
        });
    }
}
