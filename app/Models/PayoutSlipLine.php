<?php

namespace App\Models;

use App\Enums\PayoutLineType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayoutSlipLine extends Model
{
    protected $fillable = [
        'payout_slip_id',
        'type',
        'sewing_delivery_id',
        'revision_id',
        'description',
        'color',
        'size',
        'qty',
        'rate',
        'subtotal',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => PayoutLineType::class,
            'qty' => 'integer',
            'rate' => 'integer',
            'subtotal' => 'integer',
            'occurred_at' => 'datetime',
        ];
    }

    public function slip(): BelongsTo
    {
        return $this->belongsTo(PayoutSlip::class, 'payout_slip_id');
    }
}
