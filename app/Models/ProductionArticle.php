<?php

namespace App\Models;

use App\Enums\ProductionArticleStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionArticle extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_type_id',
        'created_by',
        'article_name',
        'color',
        'size',
        'planned_qty',
        'available_qty',
        'assigned_qty',
        'completed_qty',
        'status',
        'ready_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'planned_qty' => 'integer',
            'available_qty' => 'integer',
            'assigned_qty' => 'integer',
            'completed_qty' => 'integer',
            'status' => ProductionArticleStatus::class,
            'ready_at' => 'date',
        ];
    }

    public function workType(): BelongsTo
    {
        return $this->belongsTo(WorkType::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TailorAssignment::class);
    }
}
