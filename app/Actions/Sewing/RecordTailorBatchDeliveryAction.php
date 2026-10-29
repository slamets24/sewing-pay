<?php

namespace App\Actions\Sewing;

use App\Enums\PickupItemStatus;
use App\Models\PickupItem;
use App\Models\SewingDelivery;
use App\Models\Tailor;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Delivers all currently open pickup items for a tailor in a single atomic transaction.
 */
class RecordTailorBatchDeliveryAction
{
    public function __construct(private RecordDeliveryAction $recordDelivery) {}

    /**
     * @return Collection<int, SewingDelivery>
     */
    public function execute(Tailor $tailor, ?string $deliveredAt = null, ?string $notes = null, ?int $createdBy = null): Collection
    {
        return DB::transaction(function () use ($tailor, $deliveredAt, $notes, $createdBy) {
            $openItems = PickupItem::query()
                ->where('tailor_id', $tailor->id)
                ->where('status', PickupItemStatus::Open)
                ->lockForUpdate()
                ->get();

            if ($openItems->isEmpty()) {
                throw ValidationException::withMessages(['general' => "{$tailor->name} tidak sedang memegang barang yang bisa disetor."]);
            }

            $deliveries = collect();
            foreach ($openItems as $item) {
                $remaining = $item->remainingQty();
                if ($remaining > 0) {
                    $deliveries->push(
                        $this->recordDelivery->execute($item, $remaining, $deliveredAt, $notes, $createdBy)
                    );
                }
            }

            if ($deliveries->isEmpty()) {
                throw ValidationException::withMessages(['general' => "Semua barang {$tailor->name} sudah selesai disetor."]);
            }

            return $deliveries;
        });
    }
}
