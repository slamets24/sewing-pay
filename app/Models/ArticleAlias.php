<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A name as it appears in WhatsApp work orders, remembered once an admin maps it to an article. */
class ArticleAlias extends Model
{
    protected $fillable = [
        'article_id',
        'alias',
    ];

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    public static function normalize(string $name): string
    {
        return (string) preg_replace('/\s+/', ' ', mb_strtolower(trim($name)));
    }
}
