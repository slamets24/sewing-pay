<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'number',
        'channel',
        'category',
        'ordered_at',
        'due_at',
        'is_opening_stock',
        'source_text',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'ordered_at' => 'date',
            'due_at' => 'date',
            'is_opening_stock' => 'boolean',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(WorkOrderItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function plannedQty(): int
    {
        return (int) $this->items->sum('planned_qty');
    }

    public function isDone(): bool
    {
        return $this->items->isNotEmpty() && $this->items->every(fn (WorkOrderItem $item) => $item->isDone());
    }

    public function isOverdue(): bool
    {
        return $this->due_at !== null && ! $this->isDone() && $this->due_at->isBefore(today());
    }

    public function hasReceivedAnything(): bool
    {
        return $this->items->contains(fn (WorkOrderItem $item) => $item->received_qty > 0);
    }
}
