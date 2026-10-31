<?php

namespace Tests\Feature\Sewing;

use App\Enums\WorkOrderItemStage;
use App\Models\ArticleAlias;
use App\Models\HancaanReceipt;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOrderFlowTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    public function test_work_order_merges_duplicate_lines_normalizes_names_and_remembers_aliases(): void
    {
        $article = $this->article();

        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-orders.store'), [
                'number' => 'LOKA 324',
                'channel' => 'Orderan reseller & toko online',
                'category' => 'PRINT',
                'items' => [
                    ['article_id' => $article->id, 'color' => 'teal  blue', 'size' => 's', 'planned_qty' => 1, 'alias' => 'MARINA ONE SET'],
                    ['article_id' => $article->id, 'color' => 'Teal Blue', 'size' => 'S', 'planned_qty' => 2, 'alias' => 'MARINA ONE SET'],
                    ['article_id' => $article->id, 'color' => 'Brown', 'size' => 'xxl', 'planned_qty' => 1],
                ],
            ])
            ->assertSessionHasNoErrors();

        $workOrder = WorkOrder::query()->with('items')->sole();

        $this->assertCount(2, $workOrder->items);
        $teal = $workOrder->items->firstWhere('color', 'Teal Blue');
        $this->assertSame('S', $teal->size);
        $this->assertSame(3, $teal->planned_qty);
        $this->assertSame(WorkOrderItemStage::Printing, $teal->stage());
        $this->assertSame('XXL', $workOrder->items->firstWhere('color', 'Brown')->size);
        $this->assertSame($article->id, ArticleAlias::query()->where('alias', 'marina one set')->value('article_id'));
    }

    public function test_opening_stock_work_order_is_received_in_full(): void
    {
        $article = $this->article();

        $this->actingAs($this->warehouseAdmin())->post(route('work-orders.store'), [
            'number' => 'STOK AWAL',
            'is_opening_stock' => true,
            'items' => [['article_id' => $article->id, 'color' => 'Black', 'size' => 'M', 'planned_qty' => 6]],
        ])->assertSessionHasNoErrors();

        $item = WorkOrder::query()->sole()->items()->sole();

        $this->assertSame(6, $item->received_qty);
        $this->assertSame(6, $item->availableQty());
        $this->assertSame(WorkOrderItemStage::Ready, $item->stage());
        $this->assertSame(6, (int) HancaanReceipt::query()->sum('qty'));
    }

    public function test_hancaan_receipt_can_be_undone_only_while_not_taken(): void
    {
        $admin = $this->warehouseAdmin();
        $item = $this->readyItem(qty: 0);
        $item->update(['planned_qty' => 10]);

        $this->actingAs($admin)->post(route('hancaan-receipts.store', $item), ['qty' => 4])->assertSessionHasNoErrors();
        $receipt = HancaanReceipt::query()->sole();
        $this->assertSame(4, $item->refresh()->received_qty);

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $this->tailor()->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 2]],
        ])->assertSessionHasNoErrors();

        $this->actingAs($admin)->delete(route('hancaan-receipts.destroy', $receipt))->assertSessionHasErrors('receipt');
        $this->assertSame(4, $item->refresh()->received_qty);
    }

    public function test_receive_all_pending_fills_every_line(): void
    {
        $article = $this->article();
        $admin = $this->warehouseAdmin();

        $this->actingAs($admin)->post(route('work-orders.store'), [
            'number' => 'LOKA 400',
            'items' => [
                ['article_id' => $article->id, 'color' => 'Black', 'size' => 'S', 'planned_qty' => 3],
                ['article_id' => $article->id, 'color' => 'Black', 'size' => 'M', 'planned_qty' => 5],
            ],
        ]);
        $workOrder = WorkOrder::query()->sole();

        $this->actingAs($admin)->post(route('hancaan-receipts.receive-all', $workOrder))->assertSessionHasNoErrors();

        $this->assertSame(8, (int) $workOrder->items()->sum('received_qty'));
        $this->actingAs($admin)->post(route('hancaan-receipts.receive-all', $workOrder))->assertSessionHasErrors('work_order');
    }

    public function test_work_order_with_received_goods_cannot_be_deleted(): void
    {
        $item = $this->readyItem();

        $this->actingAs($this->warehouseAdmin())
            ->delete(route('work-orders.destroy', $item->workOrder))
            ->assertSessionHasErrors('work_order');

        $this->assertModelExists($item->workOrder);
    }

    public function test_work_order_with_many_articles_and_items_is_stored_efficiently(): void
    {
        $articles = [];
        for ($i = 1; $i <= 20; $i++) {
            $articles[] = $this->article("Artikel Model $i");
        }

        $items = [];
        foreach ($articles as $index => $article) {
            $items[] = ['article_id' => $article->id, 'color' => 'Navy', 'size' => 'M', 'planned_qty' => 5, 'alias' => "ALIAS {$index}"];
            $items[] = ['article_id' => $article->id, 'color' => 'Black', 'size' => 'L', 'planned_qty' => 10, 'alias' => "ALIAS {$index}"];
            $items[] = ['article_id' => $article->id, 'color' => 'Navy', 'size' => 'M', 'planned_qty' => 5, 'alias' => "ALIAS {$index}"];
        }

        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-orders.store'), [
                'number' => 'WO-BULK-20-ARTIKEL',
                'items' => $items,
            ])
            ->assertSessionHasNoErrors();

        $workOrder = WorkOrder::query()->where('number', 'WO-BULK-20-ARTIKEL')->firstOrFail();
        // 20 articles * 2 unique color/size combinations = 40 merged items
        $this->assertCount(40, $workOrder->items);
        $this->assertSame(400, (int) $workOrder->items->sum('planned_qty'));
    }
}
