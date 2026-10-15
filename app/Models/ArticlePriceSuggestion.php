<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Latest price benchmark for an article. The official sewing rate stays on the article until someone adopts this. */
class ArticlePriceSuggestion extends Model
{
    protected $fillable = [
        'article_id',
        'hourly_rate',
        'suggested_rate',
        'payload',
        'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'hourly_rate' => 'integer',
            'suggested_rate' => 'integer',
            'payload' => 'array',
            'calculated_at' => 'datetime',
        ];
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
