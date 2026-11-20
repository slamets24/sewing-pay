<?php

namespace App\Actions\Sewing;

use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * WO Produksi dinonaktifkan / dihapus di packingv2: WO jahitnya ikut dihapus,
 * selama belum ada baris yang mulai dikerjakan (cutting, gudang, atau diambil penjahit).
 */
class CancelPackingWorkOrderAction
{
    /**
     * @return bool false kalau WO memang tidak ada di OPSEW
     *
     * @throws ValidationException kalau WO sudah mulai dikerjakan
     */
    public function execute(int $packingId): bool
    {
        return DB::transaction(function () use ($packingId): bool {
            $workOrder = WorkOrder::query()
                ->with('items')
                ->where('packing_production_order_id', $packingId)
                ->lockForUpdate()
                ->first();

            if (! $workOrder) {
                return false;
            }

            $started = $workOrder->items->filter(fn (WorkOrderItem $item) => $item->hasStarted());

            if ($started->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'work_order' => "WO {$workOrder->number} sudah mulai dikerjakan di OPSEW ({$started->count()} baris), jadi tidak dihapus.",
                ]);
            }

            $workOrder->delete();

            return true;
        });
    }
}
