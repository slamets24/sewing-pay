<?php

namespace App\Actions\Sewing;

use App\Enums\PickupItemStatus;
use App\Models\Pickup;
use App\Models\Tailor;
use App\Models\WorkOrderItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** A tailor takes one or more lines from the warehouse; the article's sewing rate is frozen at this moment. */
class CreatePickupAction
{
    /**
     * @param  array{tailor_id: int, picked_at?: ?string, notes?: ?string, items: list<array{work_order_item_id: int, qty: int}>}  $data
     */
    public function execute(array $data, ?int $createdBy = null): Pickup
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $tailor = Tailor::query()->lockForUpdate()->findOrFail($data['tailor_id']);

            if (! $tailor->is_active) {
                throw ValidationException::withMessages(['tailor_id' => 'Penjahit ini sedang tidak aktif.']);
            }

            $pickup = Pickup::create([
                'tailor_id' => $tailor->id,
                'picked_at' => isset($data['picked_at']) ? Carbon::parse($data['picked_at']) : now(),
                'notes' => $data['notes'] ?? null,
                'created_by' => $createdBy,
            ]);

            $lines = collect($data['items'])->groupBy('work_order_item_id')->map(fn ($group) => (int) $group->sum('qty'));

            foreach ($lines as $itemId => $qty) {
                $item = WorkOrderItem::query()->with(['article', 'workOrder'])->lockForUpdate()->findOrFail($itemId);

                if ($qty > $item->availableQty()) {
                    throw ValidationException::withMessages([
                        'items' => "{$item->article->name} {$item->variantLabel()} ({$item->workOrder->number}) hanya tersisa {$item->availableQty()} pcs di gudang.",
                    ]);
                }

                $item->increment('assigned_qty', $qty);

                $pickup->items()->create([
                    'tailor_id' => $tailor->id,
                    'work_order_item_id' => $item->id,
                    'qty' => $qty,
                    'sewing_rate' => $tailor->isPaidHere() ? $item->article->sewing_rate : 0,
                    'status' => PickupItemStatus::Open,
                ]);
            }

            return $pickup->load(['tailor', 'items']);
        });
    }
}
