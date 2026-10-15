<?php

namespace App\Models;

use App\Enums\ArticleSource;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Article extends Model
{
    use HasFactory;

    protected $fillable = [
        'source',
        'packing_article_id',
        'name',
        'brand_name',
        'category_name',
        'sewing_rate',
        'is_active',
        'notes',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'source' => ArticleSource::class,
            'packing_article_id' => 'integer',
            'sewing_rate' => 'integer',
            'is_active' => 'boolean',
            'synced_at' => 'datetime',
        ];
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ArticleVariant::class);
    }

    public function aliases(): HasMany
    {
        return $this->hasMany(ArticleAlias::class);
    }

    public function workOrderItems(): HasMany
    {
        return $this->hasMany(WorkOrderItem::class);
    }

    public function sewingSamples(): HasMany
    {
        return $this->hasMany(ArticleSewingSample::class);
    }

    public function priceSuggestion(): HasOne
    {
        return $this->hasOne(ArticlePriceSuggestion::class);
    }

    /** Name as shown on the floor, e.g. "Marina One Set". */
    public function displayName(): string
    {
        return trim($this->name.' '.($this->category_name && ! str_contains(mb_strtolower($this->name), mb_strtolower($this->category_name)) ? $this->category_name : ''));
    }
}
