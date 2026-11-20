<?php

namespace App\Actions\Sewing;

use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Support\Facades\DB;

/**
 * Menerima WO Produksi dari packingv2: membuat WO baru, atau menyamakan WO yang sudah ada dengan isi terbaru di packing
 * (nomor WO, qty per baris, baris baru, baris yang dihapus). packingv2 adalah sumber data WO.
 *
 * Pengaman supaya pekerjaan jahit yang sudah berjalan tidak rusak:
 * - qty rencana tidak diturunkan di bawah yang sudah dikirim ke cutting / masuk gudang;
 * - baris yang sudah mulai diproses tidak dihapus.
 * Hal yang tidak bisa diterapkan dikembalikan sebagai peringatan untuk ditampilkan di packingv2.
 */
class UpsertPackingWorkOrderAction
{
    public function __construct(private readonly ReceivePackingWorkOrderAction $receive) {}

    /**
     * @param  array<string, mixed>  $data  isi sama dengan ReceivePackingWorkOrderAction::rules() + packing_production_order_id
     * @return array{work_order: WorkOrder, created: bool, warnings: list<string>}
     */
    public function execute(array $data): array
    {
        return DB::transaction(function () use ($data): array {
            $packingId = (int) $data['packing_production_order_id'];

            $workOrder = WorkOrder::query()
                ->with('items.article')
                ->where('packing_production_order_id', $packingId)
                ->lockForUpdate()
                ->first();

            if (! $workOrder) {
                return [...$this->receive->execute($data), 'warnings' => []];
            }

            $workOrder->update([
                'number' => $this->uniqueNumber(trim((string) $data['number']), $packingId, $workOrder),
                'channel' => $data['channel'] ?? null,
                'category' => $data['category'] ?? null,
                'notes' => $data['notes'] ?? null,
                'packing_synced_at' => now(),
            ]);

            $warnings = [];
            $incomingItemIds = [];

            foreach ($data['items'] as $line) {
                $packingItemId = (int) $line['packing_item_id'];
                $incomingItemIds[] = $packingItemId;

                /** @var WorkOrderItem|null $item */
                $item = $workOrder->items->firstWhere('packing_production_order_item_id', $packingItemId);

                if (! $item) {
                    $this->receive->createItem($workOrder, $line);

                    continue;
                }

                $warning = $this->updatePlannedQty($item, (int) $line['quantity']);

                if ($warning !== null) {
                    $warnings[] = $warning;
                }
            }

            foreach ($workOrder->items as $item) {
                if ($item->packing_production_order_item_id === null || in_array($item->packing_production_order_item_id, $incomingItemIds, true)) {
                    continue;
                }

                if ($item->hasStarted()) {
                    $warnings[] = "{$this->label($item)} dihapus di packing, tapi di OPSEW sudah mulai dikerjakan, jadi barisnya tetap ada.";

                    continue;
                }

                $item->delete();
            }

            return ['work_order' => $workOrder->fresh('items'), 'created' => false, 'warnings' => $warnings];
        });
    }

    private function updatePlannedQty(WorkOrderItem $item, int $quantity): ?string
    {
        $minimum = $item->minimumPlannedQty();
        $warning = null;

        if ($quantity < $minimum) {
            $warning = "{$this->label($item)}: qty packing {$quantity}, tapi di OPSEW {$minimum} pcs sudah berjalan, jadi qty dibuat {$minimum}.";
            $quantity = $minimum;
        }

        $attributes = ['planned_qty' => $quantity];

        if ($item->isPolosan()) {
            $attributes['cutting_qty'] = $quantity;
        }

        $item->forceFill($attributes)->save();

        return $warning;
    }

    private function label(WorkOrderItem $item): string
    {
        return trim(($item->article?->displayName() ?? 'Artikel').' '.$item->variantLabel());
    }

    /**
     * Nomor WO di sweing-pay wajib unik. Kalau sudah dipakai WO lain, tambahkan akhiran packing.
     */
    private function uniqueNumber(string $number, int $packingId, WorkOrder $current): string
    {
        $takenByOther = WorkOrder::query()
            ->where('number', $number)
            ->whereKeyNot($current->id)
            ->exists();

        return $takenByOther ? "{$number}-PK{$packingId}" : $number;
    }
}
