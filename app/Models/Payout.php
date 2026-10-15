<?php

namespace App\Models;

use App\Enums\PayoutStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A pay run on a free date: everything unpaid up to the cut-off date. */
class Payout extends Model
{
    protected $fillable = [
        'code',
        'cutoff_date',
        'status',
        'total_tailors',
        'total_qty',
        'total_amount',
        'generated_at',
        'paid_at',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'cutoff_date' => 'date',
            'status' => PayoutStatus::class,
            'total_tailors' => 'integer',
            'total_qty' => 'integer',
            'total_amount' => 'integer',
            'generated_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function slips(): HasMany
    {
        return $this->hasMany(PayoutSlip::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isDraft(): bool
    {
        return $this->status === PayoutStatus::Draft;
    }
}
