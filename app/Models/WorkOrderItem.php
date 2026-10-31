<?php

namespace App\Models;

use App\Enums\TailorType;
use App\Enums\WorkOrderItemStage;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One article × color × size line of a work order, with qty counters for each stage:
 * planned (WO) → printing (if print) → cutting → received (hancaan in warehouse) → assigned (tailor/makloon) → delivered (sewn).
 */
class WorkOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_order_id',
        'article_id',
        'article_variant_id',
        'color',
        'size',
        'item_type',
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
            'planned_qty' => 'integer',
            'cutting_qty' => 'integer',
            'received_qty' => 'integer',
            'assigned_qty' => 'integer',
            'delivered_qty' => 'integer',
            'revision_hold_qty' => 'integer',
        ];
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

    public function pickupItems(): HasMany
    {
        return $this->hasMany(PickupItem::class);
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

    /** In the warehouse, ready for a tailor to take. */
    public function availableQty(): int
    {
        return max(0, $this->received_qty - $this->assigned_qty - $this->revision_hold_qty);
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

    public function isDone(): bool
    {
        return $this->received_qty > 0 && $this->pendingQty() === 0 && $this->availableQty() === 0 && $this->sewingQty() === 0 && $this->holdQty() === 0;
    }

    public function stage(): WorkOrderItemStage
    {
        return match (true) {
            $this->received_qty === 0 && ! $this->isPolosan() && $this->cutting_qty === 0 => WorkOrderItemStage::Printing,
            $this->received_qty === 0 => WorkOrderItemStage::Cutting,
            $this->availableQty() > 0 => WorkOrderItemStage::Ready,
            $this->sewingQty() > 0 => WorkOrderItemStage::Sewing,
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
