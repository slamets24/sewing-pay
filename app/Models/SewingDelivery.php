<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/** A tailor handing back sewn pieces ("setor"): the piece is finished for this division and counts toward pay right away (internal tailors). */
class SewingDelivery extends Model
{
    protected $fillable = [
        'pickup_item_id',
        'tailor_id',
        'work_order_item_id',
        'qty',
        'sewing_rate',
        'subtotal',
        'is_payable',
        'delivered_at',
        'qc_shipment_id',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'integer',
            'sewing_rate' => 'integer',
            'subtotal' => 'integer',
            'is_payable' => 'boolean',
            'delivered_at' => 'datetime',
        ];
    }

    public function pickupItem(): BelongsTo
    {
        return $this->belongsTo(PickupItem::class);
    }

    public function tailor(): BelongsTo
    {
        return $this->belongsTo(Tailor::class);
    }

    public function workOrderItem(): BelongsTo
    {
        return $this->belongsTo(WorkOrderItem::class);
    }

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(QcShipment::class, 'qc_shipment_id');
    }

    public function slipLine(): HasOne
    {
        return $this->hasOne(PayoutSlipLine::class);
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(Revision::class);
    }

    public function isShipped(): bool
    {
        return $this->qc_shipment_id !== null;
    }
}
