<?php

namespace App\Actions\Sewing;

use App\Enums\ArticleSource;
use App\Models\Article;
use App\Models\ArticleVariant;
use App\Services\Sewing\PackingArticleClient;
use App\Support\VariantName;
use Illuminate\Support\Facades\DB;

/** Upserts packingv2 articles and variants into the local catalog. Sewing rates stay untouched. */
class SyncPackingArticlesAction
{
    public function __construct(private readonly PackingArticleClient $client) {}

    /**
     * @return array{articles: int, variants: int}
     */
    public function execute(): array
    {
        $articleCount = 0;
        $variantCount = 0;

        foreach ($this->client->articles() as $payload) {
            DB::transaction(function () use ($payload, &$articleCount, &$variantCount) {
                $article = Article::query()->firstOrNew(['packing_article_id' => (int) $payload['id']]);

                $article->fill([
                    'source' => ArticleSource::Packingv2,
                    'name' => (string) $payload['name'],
                    'brand_name' => $payload['brand']['name'] ?? null,
                    'category_name' => $payload['category']['name'] ?? null,
                    'is_active' => ($payload['deleted_at'] ?? null) === null,
                    'synced_at' => now(),
                ]);
                $article->sewing_rate ??= 0;
                $article->save();
                $articleCount++;

                foreach ($payload['variants'] ?? [] as $variant) {
                    $this->syncVariant($article, $variant);
                    $variantCount++;
                }
            });
        }

        return ['articles' => $articleCount, 'variants' => $variantCount];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function syncVariant(Article $article, array $payload): void
    {
        $color = VariantName::color($payload['color'] ?? null);
        $size = VariantName::size($payload['size'] ?? null);
        $barcodeId = isset($payload['master_barcode_id']) ? (int) $payload['master_barcode_id'] : null;

        $variant = ($barcodeId ? ArticleVariant::query()->where('packing_master_barcode_id', $barcodeId)->first() : null)
            ?? $article->variants()
                ->whereNull('packing_master_barcode_id')
                ->get()
                ->first(fn (ArticleVariant $existing) => VariantName::color($existing->color) === $color && VariantName::size($existing->size) === $size)
            ?? new ArticleVariant(['article_id' => $article->id]);

        $variant->fill([
            'article_id' => $article->id,
            'packing_master_barcode_id' => $barcodeId,
            'barcode_value' => $payload['barcode_value'] ?? null,
            'item_type' => $payload['item_type'] ?? null,
            'color' => $color,
            'size' => $size,
            'size_sort' => $payload['size_sort_order'] ?? VariantName::sizeRank($size),
            'is_active' => (bool) ($payload['is_active'] ?? true),
        ])->save();
    }
}
