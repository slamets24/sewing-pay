<?php

namespace App\Services\Sewing;

use App\Models\Article;
use App\Models\ArticleVariant;
use App\Support\VariantName;

/** Finds the variant (and so the barcode) for an article × color × size, creating a barcode-less one when packingv2 has none. */
class ArticleVariantResolver
{
    public function resolve(Article $article, ?string $color, ?string $size): ArticleVariant
    {
        $color = VariantName::color($color);
        $size = VariantName::size($size);

        $existing = $article->variants()
            ->get()
            ->sortBy(fn (ArticleVariant $variant) => $variant->barcode_value === null ? 1 : 0)
            ->first(fn (ArticleVariant $variant) => VariantName::color($variant->color) === $color && VariantName::size($variant->size) === $size);

        return $existing ?? $article->variants()->create([
            'color' => $color,
            'size' => $size,
            'size_sort' => VariantName::sizeRank($size),
            'is_active' => true,
        ]);
    }
}
