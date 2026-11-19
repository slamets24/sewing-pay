<?php

namespace App\Actions\Sewing;

use App\Enums\ArticleSource;
use App\Models\Article;
use App\Models\ArticleVariant;
use App\Models\WorkOrder;
use App\Services\Sewing\ArticleVariantResolver;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Menerima WO Produksi baru dari packingv2 dan membuatnya sebagai WO jahit biasa.
 *
 * WO hanya dibuat sekali. Kalau packing_production_order_id yang sama dikirim lagi,
 * WO yang sudah ada dikembalikan apa adanya: setelah masuk, WO sepenuhnya dikelola di sweing-pay
 * dan packingv2 hanya membaca progresnya.
 */
class ReceivePackingWorkOrderAction
{
    public function __construct(private readonly ArticleVariantResolver $variants) {}

    /**
     * Aturan validasi isi WO dari packingv2. Dipakai saat packingv2 mengirim (API) maupun saat OPSEW menarik.
     *
     * @return array<string, list<string>>
     */
    public static function rules(): array
    {
        return [
            'number' => ['required', 'string', 'max:60'],
            'channel' => ['nullable', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:60'],
            'ordered_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:500'],
            'items.*.packing_item_id' => ['required', 'integer', 'distinct'],
            'items.*.packing_article_id' => ['nullable', 'integer'],
            'items.*.packing_master_barcode_id' => ['nullable', 'integer'],
            'items.*.barcode_value' => ['nullable', 'string', 'max:255'],
            'items.*.article_name' => ['required', 'string', 'max:255'],
            'items.*.brand_name' => ['nullable', 'string', 'max:255'],
            'items.*.category_name' => ['nullable', 'string', 'max:255'],
            'items.*.fabric_type' => ['nullable', 'string', 'in:polos,print'],
            'items.*.color' => ['nullable', 'string', 'max:80'],
            'items.*.size' => ['nullable', 'string', 'max:20'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100000'],
        ];
    }

    /**
     * @param  array{packing_production_order_id: int, number: string, channel?: ?string, category?: ?string, ordered_at?: ?string, notes?: ?string, items: list<array{packing_item_id: int, packing_article_id?: ?int, packing_master_barcode_id?: ?int, barcode_value?: ?string, article_name: string, brand_name?: ?string, category_name?: ?string, color?: ?string, size?: ?string, quantity: int}>}  $data
     * @return array{work_order: WorkOrder, created: bool}
     */
    public function execute(array $data): array
    {
        return DB::transaction(function () use ($data): array {
            $packingId = (int) $data['packing_production_order_id'];

            $existing = WorkOrder::query()
                ->with('items')
                ->where('packing_production_order_id', $packingId)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                return ['work_order' => $existing, 'created' => false];
            }

            $orderedAt = filled($data['ordered_at'] ?? null) ? Carbon::parse($data['ordered_at']) : today();

            $workOrder = WorkOrder::create([
                'packing_production_order_id' => $packingId,
                'number' => $this->uniqueNumber(trim($data['number']), $packingId),
                'channel' => $data['channel'] ?? null,
                'category' => $data['category'] ?? null,
                'ordered_at' => $orderedAt,
                'due_at' => $orderedAt->copy()->addDays(7),
                'is_opening_stock' => false,
                'notes' => $data['notes'] ?? null,
                'packing_synced_at' => now(),
            ]);

            foreach ($data['items'] as $line) {
                $article = $this->resolveArticle($line);
                $variant = $this->resolveVariant($article, $line);

                $itemType = Article::itemTypeForFabric($line['fabric_type'] ?? $article->fabric_type) ?? 'print';

                $workOrder->items()->create([
                    'packing_production_order_item_id' => (int) $line['packing_item_id'],
                    'article_id' => $variant->article_id,
                    'article_variant_id' => $variant->id,
                    'color' => $variant->color,
                    'size' => $variant->size,
                    'item_type' => $itemType,
                    'planned_qty' => (int) $line['quantity'],
                    // Kain polos tidak lewat printing: langsung masuk tahap cutting (sama seperti WO manual).
                    'cutting_qty' => $itemType === 'polosan' ? (int) $line['quantity'] : 0,
                    'received_qty' => 0,
                ]);
            }

            return ['work_order' => $workOrder->load('items'), 'created' => true];
        });
    }

    /**
     * @param  array<string, mixed>  $line
     */
    private function resolveArticle(array $line): Article
    {
        $packingArticleId = isset($line['packing_article_id']) ? (int) $line['packing_article_id'] : null;
        $name = trim((string) $line['article_name']);
        $fabricType = in_array($line['fabric_type'] ?? null, ['polos', 'print'], true) ? $line['fabric_type'] : null;
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
                $article->packing_article_id = $packingArticleId;
            }

            // packingv2 sumber resmi jenis kain: ikut perbarui kalau dikirim.
            if ($fabricType !== null) {
                $article->fabric_type = $fabricType;
            }

            $article->save();

            return $article;
        }

        return Article::create([
            'source' => ArticleSource::Packingv2,
            'packing_article_id' => $packingArticleId,
            'name' => $name,
            'brand_name' => $brandName,
            'category_name' => $line['category_name'] ?? null,
            'fabric_type' => $fabricType,
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
    private function uniqueNumber(string $number, int $packingId): string
    {
        return WorkOrder::query()->where('number', $number)->exists()
            ? "{$number}-PK{$packingId}"
            : $number;
    }
}
