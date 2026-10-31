<?php

namespace App\Models;

use App\Enums\PickupItemStatus;
use App\Enums\RevisionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PickupItem extends Model
{
    protected $fillable = [
        'pickup_id',
        'tailor_id',
        'work_order_item_id',
        'qty',
        'delivered_qty',
        'sewing_rate',
        'status',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'integer',
            'delivered_qty' => 'integer',
            'sewing_rate' => 'integer',
            'status' => PickupItemStatus::class,
            'cancelled_at' => 'datetime',
        ];
    }

    public function pickup(): BelongsTo
    {
        return $this->belongsTo(Pickup::class);
    }

    public function tailor(): BelongsTo
    {
        return $this->belongsTo(Tailor::class);
    }

    public function workOrderItem(): BelongsTo
    {
        return $this->belongsTo(WorkOrderItem::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(SewingDelivery::class);
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(Revision::class);
    }

    public function remainingQty(): int
    {
        return max(0, $this->qty - $this->delivered_qty);
    }

    /**
     * Quantity of pieces in active revisions that are still held/being repaired by the tailor.
     */
    public function openRevisionQty(): int
    {
        if ($this->relationLoaded('revisions')) {
            return (int) $this->revisions
                ->filter(fn ($r) => $r->status !== RevisionStatus::Done && ! $r->returned_to_warehouse)
                ->sum('qty');
        }

        return (int) $this->revisions()
            ->where('status', '!=', RevisionStatus::Done->value)
            ->where('returned_to_warehouse', false)
            ->sum('qty');
    }

    /**
     * Quantity of pieces in revisions that are blocked (waiting for material or not yet started).
     */
    public function blockedRevisionQty(): int
    {
        $blockedStatuses = [
            RevisionStatus::WaitingMaterial->value,
            RevisionStatus::MaterialReady->value,
        ];

        if ($this->relationLoaded('revisions')) {
            return (int) $this->revisions
                ->filter(fn ($r) => in_array($r->status instanceof RevisionStatus ? $r->status->value : $r->status, $blockedStatuses, true) && ! $r->returned_to_warehouse)
                ->sum('qty');
        }

        return (int) $this->revisions()
            ->whereIn('status', $blockedStatuses)
            ->where('returned_to_warehouse', false)
            ->sum('qty');
    }

    /**
     * Quantity of pieces currently in progress / being repaired by the tailor.
     */
    public function inProgressRevisionQty(): int
    {
        if ($this->relationLoaded('revisions')) {
            return (int) $this->revisions
                ->filter(fn ($r) => ($r->status instanceof RevisionStatus ? $r->status->value : $r->status) === RevisionStatus::InProgress->value && ! $r->returned_to_warehouse)
                ->sum('qty');
        }

        return (int) $this->revisions()
            ->where('status', RevisionStatus::InProgress->value)
            ->where('returned_to_warehouse', false)
            ->sum('qty');
    }

    /**
     * Finished pieces ready to be deposited to the desk.
     * Items in progress can be deposited; only items blocked waiting for material are excluded.
     */
    public function deliverableQty(): int
    {
        return max(0, $this->remainingQty() - $this->blockedRevisionQty());
    }

    public function isOpen(): bool
    {
        return $this->status === PickupItemStatus::Open;
    }

    /** Only a pickup nothing has been delivered from can be undone. */
    public function isCancellable(): bool
    {
        return $this->isOpen() && $this->delivered_qty === 0;
    }
}
