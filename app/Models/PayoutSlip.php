<?php

namespace App\Models;

use App\Enums\PayoutStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayoutSlip extends Model
{
    protected $fillable = [
        'payout_id',
        'tailor_id',
        'invoice_number',
        'public_token',
        'status',
        'qty',
        'gross_amount',
        'bonus_amount',
        'deduction_amount',
        'kasbon_warung_amount',
        'kasbon_mingguan_amount',
        'net_amount',
        'notes',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => PayoutStatus::class,
            'qty' => 'integer',
            'gross_amount' => 'integer',
            'bonus_amount' => 'integer',
            'deduction_amount' => 'integer',
            'kasbon_warung_amount' => 'integer',
            'kasbon_mingguan_amount' => 'integer',
            'net_amount' => 'integer',
            'paid_at' => 'datetime',
        ];
    }

    public function payout(): BelongsTo
    {
        return $this->belongsTo(Payout::class);
    }

    public function tailor(): BelongsTo
    {
        return $this->belongsTo(Tailor::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PayoutSlipLine::class);
    }

    public function isPaid(): bool
    {
        return $this->status === PayoutStatus::Paid;
    }
}
