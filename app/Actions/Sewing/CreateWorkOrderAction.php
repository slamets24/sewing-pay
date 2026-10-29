<?php

namespace App\Actions\Sewing;

use App\Models\Article;
use App\Models\ArticleAlias;
use App\Models\WorkOrder;
use App\Services\Sewing\ArticleVariantResolver;
use App\Support\VariantName;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class CreateWorkOrderAction
{
    public function __construct(private readonly ArticleVariantResolver $variants) {}

    /**
     * Opening-stock work orders ("stok awal") are already in the warehouse, so every line is received on creation.
     *
     * @param  array{number: string, channel?: ?string, category?: ?string, ordered_at?: ?string, due_at?: ?string, notes?: ?string, source_text?: ?string, is_opening_stock?: bool, items: list<array{article_id: int, color?: ?string, size?: ?string, planned_qty: int, alias?: ?string}>}  $data
     */
    public function execute(array $data, ?int $createdBy = null): WorkOrder
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $isOpeningStock = (bool) ($data['is_opening_stock'] ?? false);

            $workOrder = WorkOrder::create([
                'number' => trim($data['number']),
                'channel' => $data['channel'] ?? null,
                'category' => $data['category'] ?? null,
                'ordered_at' => $data['ordered_at'] ?? today(),
                'due_at' => $data['due_at'] ?? null,
                'is_opening_stock' => $isOpeningStock,
                'source_text' => $data['source_text'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $createdBy,
            ]);

            $articles = Article::query()->with('variants')->findMany(collect($data['items'])->pluck('article_id'))->keyBy('id');

            foreach ($this->mergeDuplicates($data['items']) as $line) {
                $article = $articles[$line['article_id']];
                $variant = $this->variants->resolve($article, $line['color'] ?? null, $line['size'] ?? null);

                $item = $workOrder->items()->create([
                    'article_id' => $article->id,
                    'article_variant_id' => $variant->id,
                    'color' => $variant->color,
                    'size' => $variant->size,
                    'planned_qty' => $line['planned_qty'],
                    'received_qty' => $isOpeningStock ? $line['planned_qty'] : 0,
                ]);

                if ($isOpeningStock) {
                    $item->receipts()->create([
                        'qty' => $line['planned_qty'],
                        'received_at' => Carbon::now(),
                        'notes' => 'Stok awal',
                        'created_by' => $createdBy,
                    ]);
                }
            }

            $this->rememberAliases($data['items']);

            return $workOrder->load('items');
        });
    }

    /**
     * @param list<array<string, mixed>> $items
     */
    private function rememberAliases(array $items): void
    {
        $uniqueAliases = [];
        foreach ($items as $line) {
            $alias = $line['alias'] ?? null;
            if (filled($alias) && isset($line['article_id'])) {
                $uniqueAliases[ArticleAlias::normalize($alias)] = (int) $line['article_id'];
            }
        }

        foreach ($uniqueAliases as $alias => $articleId) {
            ArticleAlias::query()->updateOrCreate(['alias' => $alias], ['article_id' => $articleId]);
        }
    }

    /**
     * The same article × color × size typed twice becomes one line.
     *
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    private function mergeDuplicates(array $items): array
    {
        return collect($items)
            ->groupBy(fn (array $item) => implode('|', [$item['article_id'], VariantName::color($item['color'] ?? null), VariantName::size($item['size'] ?? null)]))
            ->map(fn ($group) => [...$group->first(), 'planned_qty' => (int) $group->sum('planned_qty')])
            ->values()
            ->all();
    }
}
