<?php

namespace App\Actions\Sewing;

use App\Models\VendorJob;
use App\Models\WorkOrderItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Hancaan keluar gudang ke vendor untuk satu proses (Bordir, Prisket, ...). */
class SendToVendorAction
{
    /**
     * @param  list<array{work_order_item_id: int, qty: int}>  $lines
     * @return int total qty dikirim
     */
    public function execute(array $lines, string $process, string $vendorName, ?string $sentAt = null, ?string $notes = null, ?int $createdBy = null): int
    {
        $process = trim($process);
        $vendorName = trim((string) preg_replace('/\s+/', ' ', $vendorName));

        return DB::transaction(function () use ($lines, $process, $vendorName, $sentAt, $notes, $createdBy) {
            $total = 0;

            foreach ($lines as $line) {
                $qty = (int) $line['qty'];

                if ($qty < 1) {
                    continue;
                }

                $item = WorkOrderItem::query()->with('article')->lockForUpdate()->findOrFail($line['work_order_item_id']);
                $label = trim("{$item->article?->name} {$item->variantLabel()}");

                if (! in_array($process, $item->processList(), true)) {
                    throw ValidationException::withMessages(['process' => "{$label} tidak lewat proses {$process}."]);
                }

                $ready = $item->vendorReadyQty($process);

                if ($qty > $ready) {
                    throw ValidationException::withMessages([
                        'items' => $ready === 0
                            ? "{$label}: belum ada barang di gudang yang siap dikirim untuk {$process}."
                            : "{$label}: hanya {$ready} pcs yang siap dikirim untuk {$process}.",
                    ]);
                }

                $item->vendorJobs()->create([
                    'process' => $process,
                    'vendor_name' => $vendorName,
                    'qty' => $qty,
                    'sent_at' => $sentAt ? Carbon::parse($sentAt) : now(),
                    'notes' => $notes,
                    'created_by' => $createdBy,
                ]);
                $item->unsetRelation('vendorJobs');
                $total += $qty;
            }

            if ($total === 0) {
                throw ValidationException::withMessages(['items' => 'Isi qty yang dikirim ke vendor.']);
            }

            return $total;
        });
    }

    /** Batalkan kiriman yang belum ada barang kembali (salah input). */
    public function cancel(VendorJob $job): void
    {
        DB::transaction(function () use ($job) {
            $job = VendorJob::query()->lockForUpdate()->findOrFail($job->id);

            if ($job->returned_qty > 0) {
                throw ValidationException::withMessages([
                    'vendor_job' => 'Sebagian barang dari kiriman ini sudah kembali. Batalkan dulu penerimaannya.',
                ]);
            }

            $job->delete();
        });
    }
}
