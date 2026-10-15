<?php

namespace App\Actions\Sewing;

use App\Models\HancaanReceipt;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Records hancaan arriving from cutting into the warehouse, line by line or everything still pending. */
class ReceiveHancaanAction
{
    public function receive(WorkOrderItem $item, int $qty, ?string $receivedAt = null, ?string $notes = null, ?int $createdBy = null): HancaanReceipt
    {
        return DB::transaction(function () use ($item, $qty, $receivedAt, $notes, $createdBy) {
            $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($item->id);
            $item->increment('received_qty', $qty);

            return $item->receipts()->create([
                'qty' => $qty,
                'received_at' => $receivedAt ? Carbon::parse($receivedAt) : now(),
                'notes' => $notes,
                'created_by' => $createdBy,
            ]);
        });
    }

    /**
     * @return int total qty received
     */
    public function receiveAllPending(WorkOrder $workOrder, ?int $createdBy = null): int
    {
        return DB::transaction(function () use ($workOrder, $createdBy) {
            $total = 0;

            foreach ($workOrder->items()->lockForUpdate()->get() as $item) {
                $pending = $item->pendingQty();

                if ($pending > 0) {
                    $this->receive($item, $pending, createdBy: $createdBy);
                    $total += $pending;
                }
            }

            if ($total === 0) {
                throw ValidationException::withMessages([
                    'work_order' => 'Semua hancaan WO ini sudah masuk gudang.',
                ]);
            }

            return $total;
        });
    }

    public function undo(HancaanReceipt $receipt): void
    {
        DB::transaction(function () use ($receipt) {
            $receipt = HancaanReceipt::query()->lockForUpdate()->findOrFail($receipt->id);
            $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($receipt->work_order_item_id);

            if ($item->received_qty - $receipt->qty < $item->assigned_qty + $item->revision_hold_qty) {
                throw ValidationException::withMessages([
                    'receipt' => 'Sebagian hancaan ini sudah diambil penjahit, jadi tidak bisa dibatalkan.',
                ]);
            }

            $item->decrement('received_qty', $receipt->qty);
            $receipt->delete();
        });
    }
}
