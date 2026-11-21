<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\WorkOrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * packingv2 mengirim perubahan artikel (nama / jenis kain / proses tambahan) supaya OPSEW langsung ikut berubah.
 */
class PackingArticleApiController extends Controller
{
    /**
     * POST /api/v1/packing/articles/sync
     */
    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'articles' => ['required', 'array', 'min:1', 'max:500'],
            'articles.*.packing_article_id' => ['required', 'integer', 'distinct'],
            'articles.*.name' => ['nullable', 'string', 'max:255'],
            'articles.*.fabric_type' => ['nullable', 'string', 'in:polos,print'],
            'articles.*.processes' => ['nullable', 'array', 'max:10'],
            'articles.*.processes.*' => ['string', 'max:60'],
        ]);

        $updated = 0;

        DB::transaction(function () use ($validated, &$updated): void {
            foreach ($validated['articles'] as $incoming) {
                $article = Article::query()->where('packing_article_id', (int) $incoming['packing_article_id'])->first();

                if (! $article) {
                    continue;
                }

                if (filled($incoming['name'] ?? null)) {
                    $article->name = trim((string) $incoming['name']);
                }

                if (array_key_exists('fabric_type', $incoming)) {
                    $article->fabric_type = $incoming['fabric_type'];
                }

                if (array_key_exists('processes', $incoming)) {
                    $article->processes = Article::normalizeProcesses($incoming['processes'] ?? []);
                }

                if ($article->isDirty('fabric_type')) {
                    $this->applyFabricToPendingLines($article);
                }

                $article->synced_at = now();
                $article->save();
                $updated++;
            }
        });

        return response()->json(['message' => "{$updated} artikel diperbarui di OPSEW.", 'updated' => $updated]);
    }

    /**
     * Baris WO yang belum mulai dikerjakan ikut jenis kain baru (polos langsung cutting, print lewat printing).
     */
    private function applyFabricToPendingLines(Article $article): void
    {
        $itemType = Article::itemTypeForFabric($article->fabric_type);

        if ($itemType === null) {
            return;
        }

        $article->workOrderItems()
            ->get()
            ->reject(fn (WorkOrderItem $item) => $item->hasStarted())
            ->each(fn (WorkOrderItem $item) => $item->forceFill([
                'item_type' => $itemType,
                'cutting_qty' => $itemType === 'polosan' ? $item->planned_qty : 0,
            ])->save());
    }
}
