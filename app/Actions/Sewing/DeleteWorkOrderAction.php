<?php

namespace App\Actions\Sewing;

use App\Models\WorkOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteWorkOrderAction
{
    public function execute(WorkOrder $workOrder): void
    {
        DB::transaction(function () use ($workOrder) {
            $workOrder = WorkOrder::query()->with('items')->lockForUpdate()->findOrFail($workOrder->id);

            if ($workOrder->hasReceivedAnything()) {
                throw ValidationException::withMessages([
                    'work_order' => 'WO yang sudah ada hancaan masuk gudang tidak bisa dihapus.',
                ]);
            }

            $workOrder->delete();
        });
    }
}
