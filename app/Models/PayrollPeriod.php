<?php

namespace App\Models;

use App\Enums\PayrollPeriodStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'starts_at',
        'ends_at',
        'status',
        'total_tailors',
        'total_completed_qty',
        'total_amount',
        'generated_at',
        'locked_at',
        'paid_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'date',
            'ends_at' => 'date',
            'status' => PayrollPeriodStatus::class,
            'total_tailors' => 'integer',
            'total_completed_qty' => 'integer',
            'total_amount' => 'integer',
            'generated_at' => 'datetime',
            'locked_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function slips(): HasMany
    {
        return $this->hasMany(PayrollSlip::class);
    }

    public function isLocked(): bool
    {
        return in_array($this->status, [PayrollPeriodStatus::Locked, PayrollPeriodStatus::Paid], true);
    }
}
