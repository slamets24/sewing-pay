<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CuttingReceipt extends Model
{
    protected $fillable = [
        'work_order_item_id',
        'qty',
        'transferred_at',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'integer',
            'transferred_at' => 'datetime',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(WorkOrderItem::class, 'work_order_item_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
