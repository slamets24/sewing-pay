<?php

namespace App\Actions\Sewing;

use App\Models\CuttingReceipt;
use App\Models\HancaanReceipt;
use App\Models\WorkOrderItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Memundurkan sebagian qty satu baris WO satu tahap ke belakang:
 * - Gudang → Cutting  : hancaan yang sudah masuk gudang (dan belum diambil) dikembalikan ke cutting.
 * - Cutting → Printing: kain print yang sudah dikirim ke cutting (belum jadi hancaan) dikembalikan ke printing.
 *
 * Catatan riwayat dikurangi dari yang paling baru dulu, jadi riwayat tetap cocok dengan angka tahapnya.
 */
class StepBackWorkOrderItemAction
{
    public function toCutting(WorkOrderItem $item, int $qty): int
    {
        return DB::transaction(function () use ($item, $qty) {
            $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($item->id);
            $max = $item->availableQty();

            $this->guard($qty, $max, 'Gudang', 'Barang yang sudah diambil penjahit atau ditahan revisi tidak bisa dimundurkan dari sini.');

            $item->decrement('received_qty', $qty);
            $this->trimReceipts(HancaanReceipt::query()->where('work_order_item_id', $item->id), $qty);

            return $qty;
        });
    }

    public function toPrinting(WorkOrderItem $item, int $qty): int
    {
        return DB::transaction(function () use ($item, $qty) {
            $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($item->id);

            if ($item->isPolosan()) {
                throw ValidationException::withMessages(['qty' => 'Kain polos tidak lewat printing, jadi tidak bisa dimundurkan ke printing.']);
            }

            $max = max(0, $item->cutting_qty - $item->received_qty);

            $this->guard($qty, $max, 'Cutting', 'Yang sudah jadi hancaan di gudang mundurkan dulu ke cutting.');

            $item->decrement('cutting_qty', $qty);
            $this->trimReceipts(CuttingReceipt::query()->where('work_order_item_id', $item->id), $qty);

            return $qty;
        });
    }

    private function guard(int $qty, int $max, string $stage, string $hint): void
    {
        if ($qty < 1) {
            throw ValidationException::withMessages(['qty' => 'Isi qty minimal 1 pcs.']);
        }

        if ($qty > $max) {
            throw ValidationException::withMessages([
                'qty' => $max === 0
                    ? "Tidak ada qty di tahap {$stage} yang bisa dimundurkan. {$hint}"
                    : "Maksimal {$max} pcs bisa dimundurkan dari {$stage}. {$hint}",
            ]);
        }
    }

    /**
     * Kurangi catatan riwayat dari yang terbaru. Kalau catatannya kurang (mis. stok awal tanpa catatan),
     * angka tahap tetap dikurangi; riwayat yang ada saja yang disesuaikan.
     *
     * @param  Builder<HancaanReceipt>|Builder<CuttingReceipt>  $receipts
     */
    private function trimReceipts(Builder $receipts, int $qty): void
    {
        $remaining = $qty;

        foreach ($receipts->orderByDesc('id')->lockForUpdate()->get() as $receipt) {
            if ($remaining === 0) {
                break;
            }

            if ($receipt->qty <= $remaining) {
                $remaining -= $receipt->qty;
                $receipt->delete();
            } else {
                $receipt->update(['qty' => $receipt->qty - $remaining]);
                $remaining = 0;
            }
        }
    }
}
