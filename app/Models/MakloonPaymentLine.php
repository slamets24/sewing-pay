<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MakloonPaymentLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'makloon_payment_id',
        'sewing_delivery_id',
        'work_order_item_id',
        'description',
        'wo_number',
        'color',
        'size',
        'qty',
        'rate',
        'subtotal',
        'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'integer',
            'rate' => 'integer',
            'subtotal' => 'integer',
            'delivered_at' => 'datetime',
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(MakloonPayment::class, 'makloon_payment_id');
    }

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(SewingDelivery::class, 'sewing_delivery_id');
    }

    public function workOrderItem(): BelongsTo
    {
        return $this->belongsTo(WorkOrderItem::class);
    }
}
