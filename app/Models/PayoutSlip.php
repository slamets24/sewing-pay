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
        'kasbon_amount',
        'kasbon_deductions',
        'kasbon_reported_at',
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
            'kasbon_amount' => 'integer',
            'kasbon_deductions' => 'array',
            'kasbon_reported_at' => 'datetime',
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

    /** Slip sudah dibayar dan memotong kasbon, tapi potongannya belum tercatat di hr-azzahra. */
    public function hasPendingKasbonReport(): bool
    {
        return $this->isPaid() && $this->kasbon_amount > 0 && $this->kasbon_reported_at === null;
    }
}
