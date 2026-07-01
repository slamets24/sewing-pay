<?php

namespace App\Models;

use App\Enums\WorkTypeCategory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkType extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'category',
        'unit',
        'rate_amount',
        'is_active',
        'source',
        'source_reference',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'category' => WorkTypeCategory::class,
            'rate_amount' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function productionArticles(): HasMany
    {
        return $this->hasMany(ProductionArticle::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TailorAssignment::class);
    }

    public function completions(): HasMany
    {
        return $this->hasMany(TailorAssignmentCompletion::class);
    }
}
