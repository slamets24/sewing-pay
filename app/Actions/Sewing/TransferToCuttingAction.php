<?php

namespace App\Actions\Sewing;

use App\Models\CuttingReceipt;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransferToCuttingAction
{
    public function transfer(WorkOrderItem $item, int $qty, ?string $transferredAt = null, ?string $notes = null, ?int $createdBy = null): CuttingReceipt
    {
        return DB::transaction(function () use ($item, $qty, $transferredAt, $notes, $createdBy) {
            $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($item->id);

            if ($item->isPolosan()) {
                throw ValidationException::withMessages([
                    'qty' => 'Artikel polosan langsung ke cutting tanpa proses printing.',
                ]);
            }

            $maxTransferrable = max(0, $item->planned_qty - $item->cutting_qty);
            if ($qty > $maxTransferrable) {
                throw ValidationException::withMessages([
                    'qty' => "Maksimal yang bisa dikirim ke cutting adalah {$maxTransferrable} pcs.",
                ]);
            }

            $item->increment('cutting_qty', $qty);

            return $item->cuttingReceipts()->create([
                'qty' => $qty,
                'transferred_at' => $transferredAt ? Carbon::parse($transferredAt) : now(),
                'notes' => $notes,
                'created_by' => $createdBy,
            ]);
        });
    }

    public function transferAllPending(WorkOrder $workOrder, ?int $createdBy = null): int
    {
        return DB::transaction(function () use ($workOrder, $createdBy) {
            $total = 0;

            foreach ($workOrder->items()->lockForUpdate()->get() as $item) {
                if ($item->isPolosan()) {
                    continue;
                }

                $pending = max(0, $item->planned_qty - $item->cutting_qty);
                if ($pending > 0) {
                    $this->transfer($item, $pending, createdBy: $createdBy);
                    $total += $pending;
                }
            }

            if ($total === 0) {
                throw ValidationException::withMessages([
                    'work_order' => 'Semua artikel print WO ini sudah dikirim ke cutting.',
                ]);
            }

            return $total;
        });
    }

    /**
     * @param list<array{work_order_item_id: int, qty: int}> $items
     * @return int total transferred
     */
    public function transferBatch(array $items, ?string $transferredAt = null, ?string $notes = null, ?int $createdBy = null): int
    {
        return DB::transaction(function () use ($items, $transferredAt, $notes, $createdBy) {
            $total = 0;
            foreach ($items as $entry) {
                $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($entry['work_order_item_id']);
                $qty = (int) $entry['qty'];
                if ($qty > 0 && ! $item->isPolosan()) {
                    $this->transfer($item, $qty, $transferredAt, $notes, $createdBy);
                    $total += $qty;
                }
            }

            if ($total === 0) {
                throw ValidationException::withMessages([
                    'items' => 'Tidak ada artikel yang dipindahkan ke cutting.',
                ]);
            }

            return $total;
        });
    }

    public function undo(CuttingReceipt $receipt): void
    {
        DB::transaction(function () use ($receipt) {
            $receipt = CuttingReceipt::query()->lockForUpdate()->findOrFail($receipt->id);
            $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($receipt->work_order_item_id);

            if ($item->cutting_qty - $receipt->qty < $item->received_qty) {
                throw ValidationException::withMessages([
                    'receipt' => 'Sebagian barang ini sudah dipotong dan masuk ke gudang, jadi tidak bisa dibatalkan.',
                ]);
            }

            $item->decrement('cutting_qty', $receipt->qty);
            $receipt->delete();
        });
    }

    public function updateQty(CuttingReceipt $receipt, int $newQty): CuttingReceipt
    {
        return DB::transaction(function () use ($receipt, $newQty) {
            $receipt = CuttingReceipt::query()->lockForUpdate()->findOrFail($receipt->id);
            $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($receipt->work_order_item_id);

            $diff = $newQty - $receipt->qty;

            if ($diff < 0) {
                if ($item->cutting_qty + $diff < $item->received_qty) {
                    throw ValidationException::withMessages([
                        'qty' => "Tidak bisa dikurangi menjadi {$newQty} pcs karena {$item->received_qty} pcs sudah dipotong dan masuk gudang.",
                    ]);
                }
            } elseif ($diff > 0) {
                $maxAllowed = $item->planned_qty - $item->cutting_qty;
                if ($diff > $maxAllowed) {
                    throw ValidationException::withMessages([
                        'qty' => "Maksimal penambahan adalah {$maxAllowed} pcs (sesuai total WO {$item->planned_qty} pcs).",
                    ]);
                }
            }

            if ($diff !== 0) {
                $item->increment('cutting_qty', $diff);
                $receipt->update(['qty' => $newQty]);
            }

            return $receipt;
        });
    }
}
