<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollSlipLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_slip_id',
        'tailor_assignment_completion_id',
        'production_article_id',
        'work_type_id',
        'article_name',
        'color',
        'size',
        'work_type_name',
        'completed_qty',
        'unit_rate_amount',
        'subtotal_amount',
        'completed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'completed_qty' => 'integer',
            'unit_rate_amount' => 'integer',
            'subtotal_amount' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    public function slip(): BelongsTo
    {
        return $this->belongsTo(PayrollSlip::class, 'payroll_slip_id');
    }

    public function completion(): BelongsTo
    {
        return $this->belongsTo(TailorAssignmentCompletion::class, 'tailor_assignment_completion_id');
    }

    public function productionArticle(): BelongsTo
    {
        return $this->belongsTo(ProductionArticle::class);
    }

    public function workType(): BelongsTo
    {
        return $this->belongsTo(WorkType::class);
    }
}
