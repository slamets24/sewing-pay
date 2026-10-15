<?php

namespace App\Actions\Sewing;

use App\Enums\PickupItemStatus;
use App\Models\PickupItem;
use App\Models\WorkOrderItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Undoes a wrong pickup: the qty goes back to the warehouse. */
class CancelPickupItemAction
{
    public function execute(PickupItem $pickupItem): void
    {
        DB::transaction(function () use ($pickupItem) {
            $pickupItem = PickupItem::query()->lockForUpdate()->findOrFail($pickupItem->id);

            if (! $pickupItem->isCancellable()) {
                throw ValidationException::withMessages([
                    'pickup_item' => 'Pengambilan yang sudah ada setoran tidak bisa dibatalkan.',
                ]);
            }

            WorkOrderItem::query()->lockForUpdate()->findOrFail($pickupItem->work_order_item_id)
                ->decrement('assigned_qty', $pickupItem->qty);

            $pickupItem->forceFill([
                'status' => PickupItemStatus::Cancelled,
                'cancelled_at' => now(),
            ])->save();
        });
    }
}
