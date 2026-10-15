<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One timed sample piece, usually one color of a new article, used only to suggest a sewing rate. */
class ArticleSewingSample extends Model
{
    protected $fillable = [
        'article_id',
        'tailor_id',
        'color',
        'started_at',
        'finished_at',
        'duration_seconds',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'duration_seconds' => 'integer',
        ];
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    public function tailor(): BelongsTo
    {
        return $this->belongsTo(Tailor::class);
    }
}
