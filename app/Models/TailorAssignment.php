<?php

namespace App\Models;

use App\Enums\TailorAssignmentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TailorAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'tailor_id',
        'production_article_id',
        'work_type_id',
        'created_by',
        'cancelled_by',
        'assigned_qty',
        'completed_qty',
        'defect_qty',
        'revision_qty',
        'unit_rate_amount',
        'status',
        'assigned_at',
        'due_at',
        'cancelled_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'assigned_qty' => 'integer',
            'completed_qty' => 'integer',
            'defect_qty' => 'integer',
            'revision_qty' => 'integer',
            'unit_rate_amount' => 'integer',
            'status' => TailorAssignmentStatus::class,
            'assigned_at' => 'datetime',
            'due_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function tailor(): BelongsTo
    {
        return $this->belongsTo(Tailor::class);
    }

    public function productionArticle(): BelongsTo
    {
        return $this->belongsTo(ProductionArticle::class);
    }

    public function workType(): BelongsTo
    {
        return $this->belongsTo(WorkType::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function completions(): HasMany
    {
        return $this->hasMany(TailorAssignmentCompletion::class);
    }

    public function remainingQty(): int
    {
        return max(0, $this->assigned_qty - $this->completed_qty);
    }

    public function runningSubtotal(): int
    {
        return $this->completed_qty * $this->unit_rate_amount;
    }
}
