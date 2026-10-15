<?php

namespace App\Models;

use App\Enums\PickupItemStatus;
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

    public function remainingQty(): int
    {
        return max(0, $this->qty - $this->delivered_qty);
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
