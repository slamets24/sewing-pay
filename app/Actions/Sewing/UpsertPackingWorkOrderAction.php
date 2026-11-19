<?php

namespace App\Actions\Sewing;

use App\Enums\ArticleSource;
use App\Models\Article;
use App\Models\ArticleVariant;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Services\Sewing\ArticleVariantResolver;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Membuat atau memperbarui WO jahit dari WO Produksi packingv2.
 *
 * Dipanggil berulang kali dengan payload yang sama hasilnya tetap sama (idempotent):
 * WO dicari lewat packing_production_order_id, baris lewat packing_production_order_item_id.
 * Baris yang sudah berjalan (cutting / hancaan / dijahit) tidak pernah dihapus dan qty rencananya
 * tidak diturunkan di bawah yang sudah berjalan.
 */
class UpsertPackingWorkOrderAction
{
    public function __construct(private readonly ArticleVariantResolver $variants) {}

    /**
     * @param  array{packing_production_order_id: int, number: string, channel?: ?string, category?: ?string, ordered_at?: ?string, notes?: ?string, items: list<array{packing_item_id: int, packing_article_id?: ?int, packing_master_barcode_id?: ?int, barcode_value?: ?string, article_name: string, brand_name?: ?string, category_name?: ?string, color?: ?string, size?: ?string, quantity: int}>}  $data
     * @return array{work_order: WorkOrder, created: bool, kept_item_ids: list<int>}
     */
    public function execute(array $data): array
    {
        return DB::transaction(function () use ($data): array {
            $packingId = (int) $data['packing_production_order_id'];

            $workOrder = WorkOrder::query()
                ->with('items')
                ->where('packing_production_order_id', $packingId)
                ->lockForUpdate()
                ->first();

            $created = $workOrder === null;
            $number = $this->uniqueNumber(trim($data['number']), $packingId, $workOrder);

            if ($created) {
                $orderedAt = filled($data['ordered_at'] ?? null) ? Carbon::parse($data['ordered_at']) : today();

                $workOrder = WorkOrder::create([
                    'packing_production_order_id' => $packingId,
                    'number' => $number,
                    'channel' => $data['channel'] ?? null,
                    'category' => $data['category'] ?? null,
                    'ordered_at' => $orderedAt,
                    'due_at' => $orderedAt->copy()->addDays(7),
                    'is_opening_stock' => false,
                    'notes' => $data['notes'] ?? null,
                    'packing_synced_at' => now(),
                ]);
                $workOrder->setRelation('items', collect());
            } else {
                $workOrder->update([
                    'number' => $number,
                    'channel' => $data['channel'] ?? $workOrder->channel,
                    'category' => $data['category'] ?? $workOrder->category,
                    'notes' => $data['notes'] ?? $workOrder->notes,
                    'packing_synced_at' => now(),
                ]);
            }

            $incomingItemIds = [];

            foreach ($data['items'] as $line) {
                $incomingItemIds[] = (int) $line['packing_item_id'];
                $this->upsertItem($workOrder, $line);
            }

            $keptItemIds = $this->removeMissingItems($workOrder, $incomingItemIds);

            return [
                'work_order' => $workOrder->fresh('items'),
                'created' => $created,
                'kept_item_ids' => $keptItemIds,
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $line
     */
    private function upsertItem(WorkOrder $workOrder, array $line): void
    {
        $article = $this->resolveArticle($line);
        $variant = $this->resolveVariant($article, $line);
        $quantity = (int) $line['quantity'];

        /** @var WorkOrderItem|null $item */
        $item = $workOrder->items->firstWhere('packing_production_order_item_id', (int) $line['packing_item_id']);

        if (! $item) {
            $workOrder->items()->create([
                'packing_production_order_item_id' => (int) $line['packing_item_id'],
                'article_id' => $variant->article_id,
                'article_variant_id' => $variant->id,
                'color' => $variant->color,
                'size' => $variant->size,
                'item_type' => 'print',
                'planned_qty' => $quantity,
                'cutting_qty' => 0,
                'received_qty' => 0,
            ]);

            return;
        }

        $attributes = ['planned_qty' => max($quantity, $item->minimumPlannedQty())];

        if (! $item->hasProgress()) {
            $attributes += [
                'article_id' => $variant->article_id,
                'article_variant_id' => $variant->id,
                'color' => $variant->color,
                'size' => $variant->size,
            ];
        }

        $item->update($attributes);
    }

    /**
     * @param  list<int>  $incomingItemIds
     * @return list<int> baris yang dihapus di packingv2 tetapi dipertahankan karena sudah berjalan
     */
    private function removeMissingItems(WorkOrder $workOrder, array $incomingItemIds): array
    {
        $kept = [];

        $workOrder->items
            ->filter(fn (WorkOrderItem $item) => $item->packing_production_order_item_id !== null
                && ! in_array($item->packing_production_order_item_id, $incomingItemIds, true))
            ->each(function (WorkOrderItem $item) use (&$kept) {
                if ($item->hasProgress()) {
                    $kept[] = $item->packing_production_order_item_id;

                    return;
                }

                $item->delete();
            });

        return $kept;
    }

    /**
     * @param  array<string, mixed>  $line
     */
    private function resolveArticle(array $line): Article
    {
        $packingArticleId = isset($line['packing_article_id']) ? (int) $line['packing_article_id'] : null;
        $name = trim((string) $line['article_name']);
        $brandName = filled($line['brand_name'] ?? null) ? trim((string) $line['brand_name']) : null;

        $article = $packingArticleId
            ? Article::query()->where('packing_article_id', $packingArticleId)->first()
            : null;

        $article ??= Article::query()
            ->whereNull('packing_article_id')
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->when($brandName, fn ($query) => $query->whereRaw('LOWER(brand_name) = ?', [mb_strtolower($brandName)]))
            ->first();

        if ($article) {
            if ($packingArticleId && $article->packing_article_id === null) {
                $article->update(['packing_article_id' => $packingArticleId]);
            }

            return $article;
        }

        return Article::create([
            'source' => ArticleSource::Packingv2,
            'packing_article_id' => $packingArticleId,
            'name' => $name,
            'brand_name' => $brandName,
            'category_name' => $line['category_name'] ?? null,
            'sewing_rate' => 0,
            'is_active' => true,
            'synced_at' => now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $line
     */
    private function resolveVariant(Article $article, array $line): ArticleVariant
    {
        $barcodeId = isset($line['packing_master_barcode_id']) ? (int) $line['packing_master_barcode_id'] : null;

        if ($barcodeId) {
            $existing = ArticleVariant::query()->where('packing_master_barcode_id', $barcodeId)->first();

            if ($existing) {
                return $existing;
            }
        }

        $variant = $this->variants->resolve($article, $line['color'] ?? null, $line['size'] ?? null);

        if ($barcodeId && $variant->packing_master_barcode_id === null) {
            $variant->update([
                'packing_master_barcode_id' => $barcodeId,
                'barcode_value' => $variant->barcode_value ?? ($line['barcode_value'] ?? null),
            ]);
        }

        return $variant;
    }

    /**
     * Nomor WO di sweing-pay wajib unik. Kalau sudah dipakai WO lain, tambahkan akhiran packing.
     */
    private function uniqueNumber(string $number, int $packingId, ?WorkOrder $current): string
    {
        $takenByOther = WorkOrder::query()
            ->where('number', $number)
            ->when($current, fn ($query) => $query->whereKeyNot($current->id))
            ->exists();

        return $takenByOther ? "{$number}-PK{$packingId}" : $number;
    }
}
