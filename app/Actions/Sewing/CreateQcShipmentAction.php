<?php

namespace App\Actions\Sewing;

use App\Models\QcShipment;
use App\Models\SewingDelivery;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Bundles sewn deliveries into one hand-over to QC; labels are printed per shipment. */
class CreateQcShipmentAction
{
    /**
     * @param  list<int>  $deliveryIds
     */
    public function execute(array $deliveryIds, ?string $notes = null, ?int $createdBy = null): QcShipment
    {
        return DB::transaction(function () use ($deliveryIds, $notes, $createdBy) {
            $deliveries = SewingDelivery::query()->whereKey($deliveryIds)->lockForUpdate()->get();

            if ($deliveries->count() !== count(array_unique($deliveryIds))) {
                throw ValidationException::withMessages(['delivery_ids' => 'Sebagian setoran tidak ditemukan.']);
            }

            if ($deliveries->contains(fn (SewingDelivery $delivery) => $delivery->isShipped())) {
                throw ValidationException::withMessages(['delivery_ids' => 'Sebagian setoran sudah dikirim ke QC.']);
            }

            $shipment = QcShipment::create([
                'number' => $this->nextNumber(),
                'sent_at' => now(),
                'notes' => $notes,
                'created_by' => $createdBy,
            ]);

            SewingDelivery::query()->whereKey($deliveries->modelKeys())->update(['qc_shipment_id' => $shipment->id]);

            return $shipment->load('deliveries');
        });
    }

    private function nextNumber(): string
    {
        $prefix = 'QC-'.now()->format('ymd').'-';
        $todayCount = QcShipment::query()->where('number', 'like', $prefix.'%')->count();

        return $prefix.Str::padLeft((string) ($todayCount + 1), 2, '0');
    }
}
