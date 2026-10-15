<?php

namespace App\Models;

use App\Enums\RevisionFoundAt;
use App\Enums\RevisionStatus;
use App\Enums\RevisionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Revision extends Model
{
    protected $fillable = [
        'type',
        'status',
        'found_at',
        'work_order_item_id',
        'sewing_delivery_id',
        'pickup_item_id',
        'returned_to_warehouse',
        'hold_released_at',
        'revision_part_id',
        'part_name',
        'material_type',
        'tailor_id',
        'qty',
        'rate',
        'subtotal',
        'reported_by',
        'reported_at',
        'material_ready_at',
        'started_at',
        'completed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'type' => RevisionType::class,
            'status' => RevisionStatus::class,
            'found_at' => RevisionFoundAt::class,
            'qty' => 'integer',
            'rate' => 'integer',
            'subtotal' => 'integer',
            'returned_to_warehouse' => 'boolean',
            'hold_released_at' => 'datetime',
            'reported_at' => 'datetime',
            'material_ready_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function workOrderItem(): BelongsTo
    {
        return $this->belongsTo(WorkOrderItem::class);
    }

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(SewingDelivery::class, 'sewing_delivery_id');
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(RevisionPart::class, 'revision_part_id');
    }

    public function tailor(): BelongsTo
    {
        return $this->belongsTo(Tailor::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function slipLine(): HasOne
    {
        return $this->hasOne(PayoutSlipLine::class);
    }

    /** Goods the tailor handed back that still block warehouse stock until replacement material arrives. */
    public function isHoldingStock(): bool
    {
        return $this->returned_to_warehouse && $this->hold_released_at === null;
    }

    public function isDone(): bool
    {
        return $this->status === RevisionStatus::Done;
    }

    public function nextStatus(): ?RevisionStatus
    {
        return $this->status->next();
    }
}
