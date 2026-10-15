<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArticleVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'article_id',
        'packing_master_barcode_id',
        'barcode_value',
        'item_type',
        'color',
        'size',
        'size_sort',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'packing_master_barcode_id' => 'integer',
            'size_sort' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
