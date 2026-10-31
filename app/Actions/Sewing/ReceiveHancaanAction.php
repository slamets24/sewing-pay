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

            $maxReceivable = max(0, $item->planned_qty - $item->received_qty);

            if ($qty > $maxReceivable) {
                throw ValidationException::withMessages([
                    'qty' => "Hanya tersisa {$maxReceivable} pcs yang belum masuk gudang.",
                ]);
            }

            if ($item->cutting_qty < $item->received_qty + $qty) {
                $item->cutting_qty = $item->received_qty + $qty;
            }

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

    /**
     * @param list<array{work_order_item_id: int, qty: int}> $items
     * @return int total received
     */
    public function receiveBatch(array $items, ?string $receivedAt = null, ?string $notes = null, ?int $createdBy = null): int
    {
        return DB::transaction(function () use ($items, $receivedAt, $notes, $createdBy) {
            $total = 0;
            foreach ($items as $entry) {
                $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($entry['work_order_item_id']);
                $qty = (int) $entry['qty'];
                if ($qty > 0) {
                    $this->receive($item, $qty, $receivedAt, $notes, $createdBy);
                    $total += $qty;
                }
            }

            if ($total === 0) {
                throw ValidationException::withMessages([
                    'items' => 'Tidak ada hancaan yang dimasukkan ke gudang.',
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

    public function updateQty(HancaanReceipt $receipt, int $newQty): HancaanReceipt
    {
        return DB::transaction(function () use ($receipt, $newQty) {
            $receipt = HancaanReceipt::query()->lockForUpdate()->findOrFail($receipt->id);
            $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($receipt->work_order_item_id);

            $diff = $newQty - $receipt->qty;

            if ($diff < 0) {
                $minRequired = $item->assigned_qty + $item->revision_hold_qty;
                if ($item->received_qty + $diff < $minRequired) {
                    throw ValidationException::withMessages([
                        'qty' => "Tidak bisa dikurangi menjadi {$newQty} pcs karena {$minRequired} pcs sudah diambil penjahit / menunggu revisi.",
                    ]);
                }
            } elseif ($diff > 0) {
                $maxAllowed = $item->planned_qty - $item->received_qty;
                if ($diff > $maxAllowed) {
                    throw ValidationException::withMessages([
                        'qty' => "Maksimal penambahan adalah {$maxAllowed} pcs (sesuai total WO {$item->planned_qty} pcs).",
                    ]);
                }
            }

            if ($diff !== 0) {
                $item->increment('received_qty', $diff);
                if ($item->cutting_qty < $item->received_qty) {
                    $item->cutting_qty = $item->received_qty;
                    $item->save();
                }
                $receipt->update(['qty' => $newQty]);
            }

            return $receipt;
        });
    }
}
