<?php

namespace Tests\Feature\Sewing;

use App\Models\Article;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PackingWorkOrderPullTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.packingv2.url' => 'https://packing.test', 'services.packingv2.key' => 'kunci-uji']);
    }

    /** @return array<string, mixed> */
    private function packingOrder(int $id, string $number, ?string $fabric = 'print', int $qty = 6): array
    {
        return [
            'packing_production_order_id' => $id,
            'status' => 'proses',
            'number' => $number,
            'channel' => 'Mitra: Toko A',
            'category' => null,
            'ordered_at' => today()->toDateString(),
            'notes' => null,
            'items' => [[
                'packing_item_id' => $id * 10,
                'packing_article_id' => 500 + $id,
                'packing_master_barcode_id' => 900 + $id,
                'barcode_value' => "LOK-{$id}",
                'article_name' => "Artikel {$id}",
                'brand_name' => 'Loka',
                'category_name' => 'Gamis',
                'fabric_type' => $fabric,
                'color' => 'Hitam',
                'size' => 'L',
                'quantity' => $qty,
            ]],
        ];
    }

    public function test_pull_creates_missing_work_orders_and_skips_existing(): void
    {
        Http::fake([
            'packing.test/api/v1/production-orders*' => Http::response([
                'data' => [$this->packingOrder(1, 'WO LOKA - 1', 'print'), $this->packingOrder(2, 'WO LOKA - 2', 'polos')],
                'meta' => ['current_page' => 1, 'last_page' => 1],
            ]),
        ]);

        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-orders.pull-packing'))
            ->assertRedirect()
            ->assertSessionHas('status', fn ($status) => str_contains($status, '2 WO baru'));

        $this->assertSame(2, WorkOrder::query()->whereNotNull('packing_production_order_id')->count());

        $print = WorkOrder::query()->where('packing_production_order_id', 1)->first()->items()->first();
        $this->assertSame('print', $print->item_type);
        $this->assertSame(0, $print->cutting_qty);

        // Kain polos tidak lewat printing: langsung siap cutting, seperti WO manual.
        $polos = WorkOrder::query()->where('packing_production_order_id', 2)->first()->items()->first();
        $this->assertSame('polosan', $polos->item_type);
        $this->assertSame(6, $polos->cutting_qty);
        $this->assertSame('polos', Article::query()->where('packing_article_id', 502)->value('fabric_type'));

        // Tarik lagi: tidak ada yang dobel.
        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-orders.pull-packing'))
            ->assertSessionHas('status', fn ($status) => str_contains($status, 'Tidak ada WO baru') && str_contains($status, '2 sudah ada'));

        $this->assertSame(2, WorkOrder::query()->count());
    }

    public function test_pull_reports_error_when_packing_is_unreachable(): void
    {
        Http::fake(['packing.test/*' => Http::response(['message' => 'down'], 500)]);

        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-orders.pull-packing'))
            ->assertRedirect()
            ->assertSessionHas('error', fn ($error) => str_contains($error, 'HTTP 500'));
    }

    public function test_pull_needs_configuration(): void
    {
        config(['services.packingv2.key' => null]);

        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-orders.pull-packing'))
            ->assertSessionHas('error');

        $this->actingAs($this->warehouseAdmin())
            ->get(route('work-orders.index'))
            ->assertInertia(fn ($page) => $page->where('packingConfigured', false));
    }

    public function test_api_push_uses_fabric_type_too(): void
    {
        $payload = $this->packingOrder(7, 'WO LOKA - 7', 'polos', 4);
        unset($payload['packing_production_order_id'], $payload['status']);

        $this->withHeaders(['X-Api-Key' => 'kunci-uji'])
            ->putJson('/api/v1/packing/work-orders/7', $payload)
            ->assertCreated();

        $item = WorkOrder::query()->where('packing_production_order_id', 7)->first()->items()->first();
        $this->assertSame('polosan', $item->item_type);
        $this->assertSame(4, $item->cutting_qty);
    }

    public function test_manual_work_order_line_defaults_to_article_fabric_type(): void
    {
        $article = $this->article('Gamis Polos');
        $article->update(['fabric_type' => 'polos']);

        $this->assertSame('polosan', Article::itemTypeForFabric($article->fresh()->fabric_type));
        $this->assertSame('print', Article::itemTypeForFabric('print'));
        $this->assertNull(Article::itemTypeForFabric(null));
    }

    public function test_article_sync_stores_fabric_type(): void
    {
        Http::fake([
            'packing.test/api/v1/articles*' => Http::response([
                'data' => [
                    ['id' => 41, 'name' => 'Marina', 'fabric_type' => 'print', 'brand' => ['name' => 'Loka'], 'category' => null, 'deleted_at' => null, 'variants' => []],
                    ['id' => 42, 'name' => 'Polos Basic', 'fabric_type' => 'polos', 'brand' => ['name' => 'Loka'], 'category' => null, 'deleted_at' => null, 'variants' => []],
                ],
                'meta' => ['current_page' => 1, 'last_page' => 1],
            ]),
        ]);

        $this->actingAs($this->owner())->post(route('articles.sync'))->assertRedirect();

        $this->assertSame('print', Article::query()->where('packing_article_id', 41)->value('fabric_type'));
        $this->assertSame('polos', Article::query()->where('packing_article_id', 42)->value('fabric_type'));
    }
}
