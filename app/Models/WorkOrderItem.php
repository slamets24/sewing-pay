<?php

namespace App\Models;

use App\Enums\TailorType;
use App\Enums\WorkOrderItemStage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\Relation;

/**
 * One article × color × size line of a work order, with qty counters for each stage:
 * planned (WO) → printing (if print) → cutting → received (hancaan in warehouse)
 * → [proses vendor: Bordir, Prisket, ... keluar & masuk gudang lagi] → assigned (tailor/makloon) → delivered (sewn).
 */
class WorkOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_order_id',
        'packing_production_order_item_id',
        'article_id',
        'article_variant_id',
        'color',
        'size',
        'item_type',
        'processes',
        'planned_qty',
        'cutting_qty',
        'received_qty',
        'assigned_qty',
        'delivered_qty',
        'revision_hold_qty',
    ];

    protected function casts(): array
    {
        return [
            'packing_production_order_item_id' => 'integer',
            'processes' => 'array',
            'planned_qty' => 'integer',
            'cutting_qty' => 'integer',
            'received_qty' => 'integer',
            'assigned_qty' => 'integer',
            'delivered_qty' => 'integer',
            'revision_hold_qty' => 'integer',
        ];
    }

    /**
     * Baris baru ikut proses tambahan artikelnya (Bordir, Prisket, ...) kalau belum diisi.
     */
    protected static function booted(): void
    {
        static::creating(function (WorkOrderItem $item): void {
            if ($item->processes === null && $item->article_id) {
                $item->processes = Article::query()->find($item->article_id)?->processNames() ?: null;
            }
        });
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ArticleVariant::class, 'article_variant_id');
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(HancaanReceipt::class);
    }

    public function cuttingReceipts(): HasMany
    {
        return $this->hasMany(CuttingReceipt::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(SewingDelivery::class);
    }

    public function pickupItems(): HasMany
    {
        return $this->hasMany(PickupItem::class);
    }

    public function vendorJobs(): HasMany
    {
        return $this->hasMany(VendorJob::class);
    }

    /**
     * Proses vendor yang wajib dilewati sebelum dijahit, urut pengerjaan.
     *
     * @return list<string>
     */
    public function processList(): array
    {
        return Article::normalizeProcesses($this->processes);
    }

    public function hasProcesses(): bool
    {
        return $this->processList() !== [];
    }

    /** Total yang pernah dikirim ke vendor untuk satu proses. */
    public function vendorSentQty(string $process): int
    {
        return (int) $this->loadedVendorJobs()->where('process', $process)->sum('qty');
    }

    /** Total yang sudah kembali ke gudang dari vendor untuk satu proses. */
    public function vendorReturnedQty(string $process): int
    {
        return (int) $this->loadedVendorJobs()->where('process', $process)->sum('returned_qty');
    }

    /**
     * Ada di gudang dan siap dikirim ke vendor untuk proses ini: hasil proses sebelumnya
     * (atau hancaan untuk proses pertama) dikurangi yang sudah dikirim untuk proses ini.
     */
    public function vendorReadyQty(string $process): int
    {
        $processes = $this->processList();
        $index = array_search($process, $processes, true);

        if ($index === false) {
            return 0;
        }

        $source = $index === 0 ? $this->received_qty : $this->vendorReturnedQty($processes[$index - 1]);

        return max(0, $source - $this->vendorSentQty($process));
    }

    /** Sedang di vendor (sudah keluar gudang, belum kembali), semua proses. */
    public function vendorQty(): int
    {
        if (! $this->hasProcesses() && ! $this->relationLoaded('vendorJobs')) {
            return 0;
        }

        return (int) $this->loadedVendorJobs()->sum(fn (VendorJob $job) => $job->openQty());
    }

    /** Di gudang tapi masih harus dikirim ke vendor untuk salah satu proses. */
    public function vendorWaitingQty(): int
    {
        return array_sum(array_map(fn (string $process) => $this->vendorReadyQty($process), $this->processList()));
    }

    /**
     * Rincian per proses untuk layar WO.
     *
     * @return list<array{process: string, waiting_qty: int, at_vendor_qty: int, done_qty: int}>
     */
    public function vendorSteps(): array
    {
        return array_map(fn (string $process) => [
            'process' => $process,
            'waiting_qty' => $this->vendorReadyQty($process),
            'at_vendor_qty' => max(0, $this->vendorSentQty($process) - $this->vendorReturnedQty($process)),
            'done_qty' => $this->vendorReturnedQty($process),
        ], $this->processList());
    }

    /** Hancaan yang sudah lewat semua proses vendor dan boleh dijahit. */
    public function sewableQty(): int
    {
        $processes = $this->processList();

        return $processes === [] ? $this->received_qty : $this->vendorReturnedQty($processes[array_key_last($processes)]);
    }

    /**
     * Qty gudang yang sudah "terpakai" (diambil penjahit, ditahan revisi, atau sudah dikirim ke vendor),
     * jadi hancaan masuk tidak boleh dikurangi di bawah angka ini.
     */
    public function lockedReceivedQty(): int
    {
        $processes = $this->processList();
        $used = $this->assigned_qty + $this->revision_hold_qty;

        return $processes === [] ? $used : max($used, $this->vendorSentQty($processes[0]));
    }

    /** Proses boleh diganti selama belum ada yang keluar gudang (ke vendor atau ke penjahit). */
    public function canChangeProcesses(): bool
    {
        return $this->assigned_qty === 0
            && $this->revision_hold_qty === 0
            && ! $this->vendorJobs()->exists();
    }

    /**
     * @return Collection<int, VendorJob>
     */
    private function loadedVendorJobs(): Collection
    {
        if (! $this->relationLoaded('vendorJobs')) {
            $this->load('vendorJobs');
        }

        return $this->vendorJobs;
    }

    public function isPolosan(): bool
    {
        return $this->item_type === 'polosan';
    }

    /** Sisa di printing (hanya untuk item print). */
    public function printingQty(): int
    {
        if ($this->isPolosan()) {
            return 0;
        }

        return max(0, $this->planned_qty - $this->cutting_qty);
    }

    /** Sisa di cutting (belum masuk gudang). */
    public function cuttingPendingQty(): int
    {
        if ($this->isPolosan()) {
            return max(0, $this->planned_qty - $this->received_qty);
        }

        return max(0, $this->cutting_qty - $this->received_qty);
    }

    /** Still at printing / cutting, not yet in the warehouse. */
    public function pendingQty(): int
    {
        return max(0, $this->planned_qty - $this->received_qty);
    }

    /** Sewn pieces already handed over to QC. Uses `qc_shipped_qty` when loaded with WorkOrderItem::withQcShippedQty(). */
    public function qcShippedQty(): int
    {
        if (array_key_exists('qc_shipped_qty', $this->attributes)) {
            return (int) $this->attributes['qc_shipped_qty'];
        }

        return (int) $this->deliveries()->whereNotNull('qc_shipment_id')->sum('qty');
    }

    /** Eager-load the QC qty for a list of lines (avoids one query per line). */
    public static function withQcShippedQty(Builder|Relation $query): Builder|Relation
    {
        return $query->withSum(['deliveries as qc_shipped_qty' => fn ($q) => $q->whereNotNull('qc_shipment_id')], 'qty');
    }

    /** Lowest planned qty allowed: what already arrived in the warehouse (and, for print items, what went to cutting). */
    public function minimumPlannedQty(): int
    {
        return $this->isPolosan() ? $this->received_qty : max($this->received_qty, $this->cutting_qty);
    }

    /** In the warehouse, ready for a tailor to take (after every vendor process is done). */
    public function availableQty(): int
    {
        return max(0, $this->sewableQty() - $this->assigned_qty - $this->revision_hold_qty);
    }

    /** Returned by a tailor because of a material defect; back in the warehouse but blocked until the new material arrives. */
    public function holdQty(): int
    {
        return $this->revision_hold_qty;
    }

    /** Taken by tailors and not delivered back yet. */
    public function sewingQty(): int
    {
        return max(0, $this->assigned_qty - $this->delivered_qty);
    }

    /** Taken by internal tailors and not delivered back yet. */
    public function internalSewingQty(): int
    {
        if (! $this->relationLoaded('pickupItems')) {
            $this->load(['pickupItems.tailor']);
        }

        return (int) $this->pickupItems
            ->filter(fn (PickupItem $pi) => $pi->isOpen() && $pi->tailor?->type === TailorType::Internal)
            ->sum(fn (PickupItem $pi) => $pi->remainingQty());
    }

    /** Taken by makloon tailors and not delivered back yet. */
    public function makloonSewingQty(): int
    {
        if (! $this->relationLoaded('pickupItems')) {
            $this->load(['pickupItems.tailor']);
        }

        return (int) $this->pickupItems
            ->filter(fn (PickupItem $pi) => $pi->isOpen() && $pi->tailor?->type === TailorType::Makloon)
            ->sum(fn (PickupItem $pi) => $pi->remainingQty());
    }

    /** Sudah mulai diproses: keluar dari printing ke cutting, masuk gudang, atau diambil penjahit. */
    public function hasStarted(): bool
    {
        return $this->received_qty > 0
            || $this->assigned_qty > 0
            || (! $this->isPolosan() && $this->cutting_qty > 0);
    }

    public function isDone(): bool
    {
        return $this->received_qty > 0
            && $this->pendingQty() === 0
            && $this->availableQty() === 0
            && $this->sewingQty() === 0
            && $this->holdQty() === 0
            && $this->vendorQty() === 0
            && $this->vendorWaitingQty() === 0;
    }

    public function stage(): WorkOrderItemStage
    {
        return match (true) {
            $this->received_qty === 0 && ! $this->isPolosan() && $this->cutting_qty === 0 => WorkOrderItemStage::Printing,
            $this->received_qty === 0 => WorkOrderItemStage::Cutting,
            $this->availableQty() > 0 => WorkOrderItemStage::Ready,
            $this->sewingQty() > 0 => WorkOrderItemStage::Sewing,
            $this->vendorQty() > 0 => WorkOrderItemStage::AtVendor,
            $this->vendorWaitingQty() > 0 => WorkOrderItemStage::WaitingVendor,
            $this->holdQty() > 0 => WorkOrderItemStage::WaitingRevision,
            $this->pendingQty() > 0 => WorkOrderItemStage::Cutting,
            default => WorkOrderItemStage::Done,
        };
    }

    public function variantLabel(): string
    {
        return collect([$this->color, $this->size])->filter()->implode(' · ');
    }
}
