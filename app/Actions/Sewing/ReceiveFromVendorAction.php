<?php

namespace App\Actions\Sewing;

use App\Models\VendorJob;
use App\Models\VendorJobReturn;
use App\Models\WorkOrderItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Barang dari vendor masuk gudang lagi; setelah proses terakhir barang siap diambil penjahit. */
class ReceiveFromVendorAction
{
    /**
     * @param  list<array{vendor_job_id: int, qty: int}>  $lines
     * @return int total qty masuk
     */
    public function execute(array $lines, ?string $returnedAt = null, ?string $notes = null, ?int $createdBy = null): int
    {
        return DB::transaction(function () use ($lines, $returnedAt, $notes, $createdBy) {
            $total = 0;

            foreach ($lines as $line) {
                $qty = (int) $line['qty'];

                if ($qty < 1) {
                    continue;
                }

                $job = VendorJob::query()->with('item.article')->lockForUpdate()->findOrFail($line['vendor_job_id']);

                if ($qty > $job->openQty()) {
                    $label = trim("{$job->item->article?->name} {$job->item->variantLabel()}");

                    throw ValidationException::withMessages([
                        'items' => "{$label}: di {$job->vendor_name} ({$job->process}) tinggal {$job->openQty()} pcs.",
                    ]);
                }

                $job->increment('returned_qty', $qty);
                $job->returns()->create([
                    'qty' => $qty,
                    'returned_at' => $returnedAt ? Carbon::parse($returnedAt) : now(),
                    'notes' => $notes,
                    'created_by' => $createdBy,
                ]);
                $total += $qty;
            }

            if ($total === 0) {
                throw ValidationException::withMessages(['items' => 'Isi qty yang masuk dari vendor.']);
            }

            return $total;
        });
    }

    /**
     * Batalkan satu penerimaan dari vendor, selama barangnya belum dipakai tahap berikutnya
     * (dikirim ke proses berikutnya atau diambil penjahit).
     */
    public function undo(VendorJobReturn $return): void
    {
        DB::transaction(function () use ($return) {
            $return = VendorJobReturn::query()->lockForUpdate()->findOrFail($return->id);
            $job = VendorJob::query()->lockForUpdate()->findOrFail($return->vendor_job_id);
            $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($job->work_order_item_id);

            $processes = $item->processList();
            $index = array_search($job->process, $processes, true);
            $returnedAfterUndo = $item->vendorReturnedQty($job->process) - $return->qty;
            $next = $index === false ? null : ($processes[$index + 1] ?? null);
            $usedDownstream = $next !== null
                ? $item->vendorSentQty($next)
                : $item->assigned_qty + $item->revision_hold_qty;

            if ($returnedAfterUndo < $usedDownstream) {
                throw ValidationException::withMessages([
                    'vendor_job_return' => $next !== null
                        ? "Barang ini sudah dikirim lagi untuk {$next}, jadi penerimaannya tidak bisa dibatalkan."
                        : 'Barang ini sudah diambil penjahit, jadi penerimaannya tidak bisa dibatalkan.',
                ]);
            }

            $job->decrement('returned_qty', $return->qty);
            $return->delete();
        });
    }
}
