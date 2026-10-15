<?php

namespace App\Actions\Sewing;

use App\Enums\PickupItemStatus;
use App\Models\PickupItem;
use App\Models\SewingDelivery;
use App\Models\WorkOrderItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Reverses a mistyped setor, as long as it has not gone to QC or onto a pay slip. */
class UndoDeliveryAction
{
    public function execute(SewingDelivery $delivery): void
    {
        DB::transaction(function () use ($delivery) {
            $delivery = SewingDelivery::query()->lockForUpdate()->findOrFail($delivery->id);

            $reason = match (true) {
                $delivery->slipLine()->exists() => 'Setoran ini sudah masuk slip gaji. Hitung ulang atau hapus draft gaji dulu.',
                $delivery->isShipped() => 'Setoran ini sudah dikirim ke QC.',
                $delivery->revisions()->exists() => 'Setoran ini sudah punya catatan revisi.',
                default => null,
            };

            if ($reason) {
                throw ValidationException::withMessages(['delivery' => $reason]);
            }

            $pickupItem = PickupItem::query()->lockForUpdate()->findOrFail($delivery->pickup_item_id);
            $pickupItem->delivered_qty = max(0, $pickupItem->delivered_qty - $delivery->qty);
            $pickupItem->status = PickupItemStatus::Open;
            $pickupItem->save();

            WorkOrderItem::query()->lockForUpdate()->findOrFail($delivery->work_order_item_id)->decrement('delivered_qty', $delivery->qty);

            $delivery->delete();
        });
    }
}
