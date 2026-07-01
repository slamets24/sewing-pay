<?php

namespace App\Models;

use App\Enums\PayrollSlipStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollSlip extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_period_id',
        'tailor_id',
        'invoice_number',
        'public_token',
        'status',
        'completed_qty',
        'gross_amount',
        'bonus_amount',
        'deduction_amount',
        'net_amount',
        'generated_at',
        'sent_at',
        'paid_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => PayrollSlipStatus::class,
            'completed_qty' => 'integer',
            'gross_amount' => 'integer',
            'bonus_amount' => 'integer',
            'deduction_amount' => 'integer',
            'net_amount' => 'integer',
            'generated_at' => 'datetime',
            'sent_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class, 'payroll_period_id');
    }

    public function tailor(): BelongsTo
    {
        return $this->belongsTo(Tailor::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PayrollSlipLine::class);
    }
}
