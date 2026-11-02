<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MakloonPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'tailor_id',
        'payment_date',
        'paid_at',
        'status',
        'total_qty',
        'gross_amount',
        'adjustment_amount',
        'net_amount',
        'payment_method',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'paid_at' => 'datetime',
            'total_qty' => 'integer',
            'gross_amount' => 'integer',
            'adjustment_amount' => 'integer',
            'net_amount' => 'integer',
        ];
    }

    public function tailor(): BelongsTo
    {
        return $this->belongsTo(Tailor::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(MakloonPaymentLine::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
