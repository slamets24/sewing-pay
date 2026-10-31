<?php

namespace App\Actions\Sewing;

use App\Enums\PickupItemStatus;
use App\Enums\RevisionStatus;
use App\Models\Pickup;
use App\Models\PickupItem;
use App\Models\Revision;
use App\Models\Tailor;
use App\Models\WorkOrderItem;
use App\Services\Sewing\RevisionStockHold;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Moves a revision one step: menunggu bahan → bahan datang → dikerjakan → selesai.
 * The fixing tailor can still be swapped before the work starts.
 */
class AdvanceRevisionAction
{
    public function __construct(private readonly RevisionStockHold $hold) {}

    public function execute(Revision $revision, ?int $tailorId = null): Revision
    {
        return DB::transaction(function () use ($revision, $tailorId) {
            $revision = Revision::query()->with('part')->lockForUpdate()->findOrFail($revision->id);
            $next = $revision->nextStatus();

            if ($next === null) {
                throw ValidationException::withMessages(['revision' => 'Revisi ini sudah selesai.']);
            }

            if ($tailorId && $tailorId !== $revision->tailor_id) {
                $this->reassign($revision, Tailor::query()->findOrFail($tailorId));
            }

            $revision->status = $next;
            $timestamp = match ($next) {
                RevisionStatus::MaterialReady => 'material_ready_at',
                RevisionStatus::InProgress => 'started_at',
                RevisionStatus::Done => 'completed_at',
                default => null,
            };

            if ($timestamp) {
                $revision->{$timestamp} = now();
            }

            if ($next === RevisionStatus::MaterialReady) {
                $this->hold->release($revision);
            }

            if ($next === RevisionStatus::InProgress) {
                $this->moveToTailor($revision);
            }

            $revision->save();

            return $revision;
        });
    }

    private function moveToTailor(Revision $revision): void
    {
        if ($revision->returned_to_warehouse) {
            $workOrderItem = WorkOrderItem::query()->lockForUpdate()->findOrFail($revision->work_order_item_id);

            $pickupItem = PickupItem::query()
                ->where('tailor_id', $revision->tailor_id)
                ->where('work_order_item_id', $revision->work_order_item_id)
                ->where('status', PickupItemStatus::Open)
                ->lockForUpdate()
                ->first();

            if ($pickupItem) {
                $pickupItem->qty += $revision->qty;
                $pickupItem->save();
            } else {
                $pickup = Pickup::create([
                    'tailor_id' => $revision->tailor_id,
                    'picked_at' => now(),
                    'notes' => "Pengerjaan revisi #{$revision->id}",
                ]);

                $pickupItem = PickupItem::create([
                    'pickup_id' => $pickup->id,
                    'tailor_id' => $revision->tailor_id,
                    'work_order_item_id' => $revision->work_order_item_id,
                    'qty' => $revision->qty,
                    'delivered_qty' => 0,
                    'sewing_rate' => $workOrderItem->sewing_rate,
                    'status' => PickupItemStatus::Open,
                ]);
            }

            $workOrderItem->assigned_qty += $revision->qty;
            $workOrderItem->save();

            $revision->pickup_item_id = $pickupItem->id;
            $revision->returned_to_warehouse = false;
        } elseif (! $revision->pickup_item_id) {
            $pickupItem = PickupItem::query()
                ->where('tailor_id', $revision->tailor_id)
                ->where('work_order_item_id', $revision->work_order_item_id)
                ->where('status', PickupItemStatus::Open)
                ->lockForUpdate()
                ->first();

            if ($pickupItem) {
                $revision->pickup_item_id = $pickupItem->id;
            }
        }
    }

    private function reassign(Revision $revision, Tailor $tailor): void
    {
        if ($revision->status === RevisionStatus::InProgress || $revision->isDone()) {
            throw ValidationException::withMessages(['tailor_id' => 'Penjahit tidak bisa diganti setelah revisi mulai dikerjakan.']);
        }

        $oldTailorId = $revision->tailor_id;

        if ($oldTailorId !== $tailor->id && $revision->pickup_item_id && ! $revision->returned_to_warehouse) {
            $oldPickupItem = PickupItem::query()->with('tailor')->lockForUpdate()->find($revision->pickup_item_id);
            if ($oldPickupItem) {
                $oldPickupItem->qty = max(0, $oldPickupItem->qty - $revision->qty);
                if ($oldPickupItem->remainingQty() === 0) {
                    $oldPickupItem->status = $oldPickupItem->delivered_qty > 0 ? PickupItemStatus::Done : PickupItemStatus::Cancelled;
                    $oldPickupItem->cancelled_at = $oldPickupItem->delivered_qty > 0 ? null : now();
                }
                $oldPickupItem->save();

                $newPickup = Pickup::create([
                    'tailor_id' => $tailor->id,
                    'picked_at' => now(),
                    'notes' => "Pengalihan revisi #{$revision->id} dari {$oldPickupItem->tailor->name}",
                ]);

                $newPickupItem = PickupItem::create([
                    'pickup_id' => $newPickup->id,
                    'tailor_id' => $tailor->id,
                    'work_order_item_id' => $revision->work_order_item_id,
                    'qty' => $revision->qty,
                    'delivered_qty' => 0,
                    'sewing_rate' => $oldPickupItem->sewing_rate,
                    'status' => PickupItemStatus::Open,
                ]);

                $revision->pickup_item_id = $newPickupItem->id;
            }
        }

        $rate = $revision->type->isPaid() && $tailor->isPaidHere() ? (int) ($revision->part?->price ?? $revision->rate) : 0;

        $revision->tailor_id = $tailor->id;
        $revision->rate = $rate;
        $revision->subtotal = $rate * $revision->qty;
    }
}
