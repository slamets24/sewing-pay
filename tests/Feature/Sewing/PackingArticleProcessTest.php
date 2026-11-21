<?php

namespace Tests\Feature\Sewing;

use App\Enums\ArticleSource;
use App\Models\Article;
use App\Models\WorkOrderItem;
use App\Presenters\WorkOrderPresenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Proses tambahan setelah cutting (Bordir, Prisket, ...) diatur di packingv2 dan ikut tersimpan di artikel OPSEW.
 */
class PackingArticleProcessTest extends TestCase
{
    use RefreshDatabase;

    private const KEY = 'kunci-uji';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.packingv2.key' => self::KEY]);
    }

    /**
     * @param  list<string>|null  $processes
     * @return array<string, mixed>
     */
    private function workOrder(?array $processes): array
    {
        $line = [
            'packing_item_id' => 81,
            'packing_article_id' => 601,
            'packing_master_barcode_id' => 981,
            'barcode_value' => 'LOK-81',
            'article_name' => 'Gamis Mawar',
            'brand_name' => 'Loka',
            'category_name' => 'Gamis',
            'fabric_type' => 'print',
            'color' => 'Hitam',
            'size' => 'L',
            'quantity' => 10,
        ];

        if ($processes !== null) {
            $line['processes'] = $processes;
        }

        return ['number' => 'WO LOKA - 8', 'channel' => 'Mitra', 'items' => [$line]];
    }

    public function test_received_work_order_stores_article_processes_in_order(): void
    {
        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->putJson('/api/v1/packing/work-orders/8', $this->workOrder(['Bordir', ' prisket ', 'bordir']))
            ->assertCreated();

        $article = Article::query()->where('packing_article_id', 601)->sole();
        $this->assertSame(['Bordir', 'prisket'], $article->processNames());

        $item = WorkOrderItem::query()->with(['article', 'variant'])->sole();
        $this->assertSame(['Bordir', 'prisket'], app(WorkOrderPresenter::class)->item($item)['processes']);
    }

    public function test_work_order_without_processes_field_keeps_existing_processes(): void
    {
        $this->packingArticle(601, 'Gamis Mawar', ['Sablon']);

        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->putJson('/api/v1/packing/work-orders/8', $this->workOrder(null))
            ->assertCreated();

        $this->assertSame(['Sablon'], Article::query()->where('packing_article_id', 601)->sole()->processNames());
    }

    public function test_article_sync_updates_and_clears_processes(): void
    {
        $article = $this->packingArticle(602, 'Scarf', ['Sablon']);

        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->postJson('/api/v1/packing/articles/sync', [
                'articles' => [['packing_article_id' => 602, 'name' => 'Scarf', 'fabric_type' => null, 'processes' => ['Bordir', 'Prisket']]],
            ])
            ->assertOk()
            ->assertJsonPath('updated', 1);

        $this->assertSame(['Bordir', 'Prisket'], $article->fresh()->processNames());

        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->postJson('/api/v1/packing/articles/sync', [
                'articles' => [['packing_article_id' => 602, 'name' => 'Scarf', 'processes' => []]],
            ])
            ->assertOk();

        $this->assertSame([], $article->fresh()->processNames());
    }

    public function test_article_sync_rejects_invalid_processes(): void
    {
        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->postJson('/api/v1/packing/articles/sync', [
                'articles' => [['packing_article_id' => 602, 'processes' => 'Bordir']],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['articles.0.processes']);
    }

    /**
     * @param  list<string>  $processes
     */
    private function packingArticle(int $packingArticleId, string $name, array $processes): Article
    {
        return Article::create([
            'source' => ArticleSource::Packingv2,
            'packing_article_id' => $packingArticleId,
            'name' => $name,
            'processes' => $processes,
            'sewing_rate' => 0,
            'is_active' => true,
        ]);
    }
}
