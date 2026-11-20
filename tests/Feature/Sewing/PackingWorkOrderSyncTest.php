<?php

namespace Tests\Feature\Sewing;

use App\Models\Article;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * packingv2 sumber data WO: setiap perubahan di packing (nomor, qty, baris, nonaktif, artikel) ikut ke OPSEW,
 * tanpa merusak pekerjaan jahit yang sudah berjalan.
 */
class PackingWorkOrderSyncTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    private const KEY = 'kunci-uji';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.packingv2.key' => self::KEY]);
    }

    /**
     * @param  list<array{0: int, 1: string, 2: int, 3?: string}>  $lines  [packing_item_id, warna, qty, jenis kain]
     * @return array<string, mixed>
     */
    private function payload(string $number, array $lines, ?string $category = null): array
    {
        return [
            'number' => $number,
            'channel' => 'Mitra: Toko A',
            'category' => $category,
            'ordered_at' => today()->toDateString(),
            'notes' => null,
            'items' => array_map(fn (array $line) => [
                'packing_item_id' => $line[0],
                'packing_article_id' => 501,
                'packing_master_barcode_id' => 900 + $line[0],
                'barcode_value' => "LOK-{$line[0]}",
                'article_name' => 'Marina',
                'brand_name' => 'Loka',
                'category_name' => 'Gamis',
                'fabric_type' => $line[3] ?? 'print',
                'color' => $line[1],
                'size' => 'L',
                'quantity' => $line[2],
            ], $lines),
        ];
    }

    private function put(int $packingId, array $payload)
    {
        return $this->withHeaders(['X-Api-Key' => self::KEY])->putJson("/api/v1/packing/work-orders/{$packingId}", $payload);
    }

    private function line(int $packingItemId): WorkOrderItem
    {
        return WorkOrderItem::query()->where('packing_production_order_item_id', $packingItemId)->sole();
    }

    public function test_changes_in_packing_update_the_existing_work_order(): void
    {
        $this->put(7, $this->payload('WO LOKA - 7', [[71, 'Hitam', 10], [72, 'Navy', 5], [73, 'Putih', 4]]))->assertCreated();

        $this->put(7, $this->payload('WO LOKA - 7 REV', [[71, 'Hitam', 12], [72, 'Navy', 3], [74, 'Mocca', 6]], 'Makloon'))
            ->assertOk()
            ->assertJsonPath('message', 'WO di OPSEW diperbarui.')
            ->assertJsonPath('warnings', []);

        $workOrder = WorkOrder::query()->where('packing_production_order_id', 7)->sole();
        $this->assertSame('WO LOKA - 7 REV', $workOrder->number);
        $this->assertSame('Makloon', $workOrder->category);
        $this->assertSame(12, $this->line(71)->planned_qty);
        $this->assertSame(3, $this->line(72)->planned_qty);
        $this->assertSame(6, $this->line(74)->planned_qty);
        $this->assertFalse(WorkOrderItem::query()->where('packing_production_order_item_id', 73)->exists());
        $this->assertSame(3, $workOrder->items()->count());
    }

    public function test_quantity_is_not_lowered_below_work_already_started(): void
    {
        $this->put(8, $this->payload('WO LOKA - 8', [[81, 'Hitam', 10]]))->assertCreated();
        $this->line(81)->update(['cutting_qty' => 6]);

        $this->put(8, $this->payload('WO LOKA - 8', [[81, 'Hitam', 4]]))
            ->assertOk()
            ->assertJsonPath('warnings.0', 'Marina Hitam · L: qty packing 4, tapi di OPSEW 6 pcs sudah berjalan, jadi qty dibuat 6.');

        $this->assertSame(6, $this->line(81)->planned_qty);
    }

    public function test_line_already_started_is_kept_when_removed_in_packing(): void
    {
        $this->put(9, $this->payload('WO LOKA - 9', [[91, 'Hitam', 5], [92, 'Navy', 5]]))->assertCreated();
        $this->line(92)->update(['cutting_qty' => 5, 'received_qty' => 5]);

        $this->put(9, $this->payload('WO LOKA - 9', [[91, 'Hitam', 5]]))
            ->assertOk()
            ->assertJsonPath('warnings.0', 'Marina Navy · L dihapus di packing, tapi di OPSEW sudah mulai dikerjakan, jadi barisnya tetap ada.');

        $this->assertTrue(WorkOrderItem::query()->where('packing_production_order_item_id', 92)->exists());
    }

    public function test_polos_line_keeps_cutting_qty_in_step_with_planned_qty(): void
    {
        $this->put(10, $this->payload('WO LOKA - 10', [[101, 'Hitam', 4, 'polos']]))->assertCreated();

        $this->put(10, $this->payload('WO LOKA - 10', [[101, 'Hitam', 9, 'polos']]))->assertOk();

        $this->assertSame(9, $this->line(101)->planned_qty);
        $this->assertSame(9, $this->line(101)->cutting_qty);
    }

    public function test_work_order_not_started_is_deleted_when_deactivated_in_packing(): void
    {
        $this->put(11, $this->payload('WO LOKA - 11', [[111, 'Hitam', 5]]))->assertCreated();

        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->deleteJson('/api/v1/packing/work-orders/11')
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertFalse(WorkOrder::query()->where('packing_production_order_id', 11)->exists());

        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->deleteJson('/api/v1/packing/work-orders/11')
            ->assertOk()
            ->assertJsonPath('deleted', false);
    }

    public function test_work_order_already_started_is_not_deleted(): void
    {
        $this->put(12, $this->payload('WO LOKA - 12', [[121, 'Hitam', 5]]))->assertCreated();
        $this->line(121)->update(['cutting_qty' => 5, 'received_qty' => 2]);

        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->deleteJson('/api/v1/packing/work-orders/12')
            ->assertStatus(409)
            ->assertJsonPath('message', 'WO WO LOKA - 12 sudah mulai dikerjakan di OPSEW (1 baris), jadi tidak dihapus.');

        $this->assertTrue(WorkOrder::query()->where('packing_production_order_id', 12)->exists());
    }

    public function test_article_name_and_fabric_type_follow_packing(): void
    {
        $this->put(13, $this->payload('WO LOKA - 13', [[131, 'Hitam', 5, 'print'], [132, 'Navy', 4, 'print']]))->assertCreated();
        $this->line(132)->update(['cutting_qty' => 4]);

        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->postJson('/api/v1/packing/articles/sync', [
                'articles' => [['packing_article_id' => 501, 'name' => 'Marina Reborn', 'fabric_type' => 'polos']],
            ])
            ->assertOk()
            ->assertJsonPath('updated', 1);

        $article = Article::query()->where('packing_article_id', 501)->sole();
        $this->assertSame('Marina Reborn', $article->name);
        $this->assertSame('polos', $article->fabric_type);

        // Baris yang belum mulai ikut jadi polos (langsung cutting); yang sudah di cutting tidak diubah.
        $this->assertSame('polosan', $this->line(131)->item_type);
        $this->assertSame(5, $this->line(131)->cutting_qty);
        $this->assertSame('print', $this->line(132)->item_type);
    }

    public function test_sync_endpoints_require_packing_key(): void
    {
        $this->deleteJson('/api/v1/packing/work-orders/1')->assertUnauthorized();
        $this->postJson('/api/v1/packing/articles/sync', ['articles' => []])->assertUnauthorized();
    }
}
