<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TailorAssignmentCompletion extends Model
{
    use HasFactory;

    protected $fillable = [
        'tailor_assignment_id',
        'tailor_id',
        'production_article_id',
        'work_type_id',
        'created_by',
        'completed_qty',
        'defect_qty',
        'revision_qty',
        'unit_rate_amount',
        'subtotal_amount',
        'completed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'completed_qty' => 'integer',
            'defect_qty' => 'integer',
            'revision_qty' => 'integer',
            'unit_rate_amount' => 'integer',
            'subtotal_amount' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(TailorAssignment::class, 'tailor_assignment_id');
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
}
