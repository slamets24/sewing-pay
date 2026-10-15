<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** One visit to the warehouse: a tailor takes one or more items, possibly from different work orders. */
class Pickup extends Model
{
    protected $fillable = [
        'tailor_id',
        'picked_at',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'picked_at' => 'datetime',
        ];
    }

    public function tailor(): BelongsTo
    {
        return $this->belongsTo(Tailor::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PickupItem::class);
    }
}
