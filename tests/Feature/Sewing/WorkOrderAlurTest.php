<?php

namespace Tests\Feature\Sewing;

use App\Enums\TailorType;
use App\Enums\WorkOrderItemStage;
use App\Models\CuttingReceipt;
use App\Models\HancaanReceipt;
use App\Models\WorkOrder;
use App\Presenters\WorkOrderPresenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class WorkOrderAlurTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    public function test_work_order_defaults_due_at_to_7_days_after_launch_date(): void
    {
        $article = $this->article();
        $admin = $this->warehouseAdmin();

        $this->actingAs($admin)->post(route('work-orders.store'), [
            'number' => 'LOKA 501',
            'ordered_at' => '2026-10-01',
            'category' => 'PRINT',
            'items' => [
                ['article_id' => $article->id, 'color' => 'Navy', 'size' => 'M', 'item_type' => 'print', 'planned_qty' => 10],
            ],
        ])->assertSessionHasNoErrors();

        $wo = WorkOrder::query()->where('number', 'LOKA 501')->sole();
        $this->assertSame('2026-10-01', $wo->ordered_at->toDateString());
        $this->assertSame('2026-10-08', $wo->due_at->toDateString());
    }

    public function test_work_order_with_print_and_polosan_items(): void
    {
        $article = $this->article();
        $admin = $this->warehouseAdmin();

        $this->actingAs($admin)->post(route('work-orders.store'), [
            'number' => 'LOKA 502',
            'ordered_at' => '2026-10-01',
            'category' => 'CAMPURAN',
            'items' => [
                ['article_id' => $article->id, 'color' => 'Navy', 'size' => 'M', 'item_type' => 'print', 'planned_qty' => 10],
                ['article_id' => $article->id, 'color' => 'Black', 'size' => 'L', 'item_type' => 'polosan', 'planned_qty' => 15],
            ],
        ])->assertSessionHasNoErrors();

        $wo = WorkOrder::query()->with('items')->where('number', 'LOKA 502')->sole();
        $printItem = $wo->items->firstWhere('color', 'Navy');
        $polosanItem = $wo->items->firstWhere('color', 'Black');

        // Print item starts in printing
        $this->assertFalse($printItem->isPolosan());
        $this->assertSame(10, $printItem->printingQty());
        $this->assertSame(0, $printItem->cuttingPendingQty());
        $this->assertSame(WorkOrderItemStage::Printing, $printItem->stage());

        // Polosan item skips printing, goes straight to cutting
        $this->assertTrue($polosanItem->isPolosan());
        $this->assertSame(0, $polosanItem->printingQty());
        $this->assertSame(15, $polosanItem->cuttingPendingQty());
        $this->assertSame(WorkOrderItemStage::Cutting, $polosanItem->stage());
    }

    public function test_transfer_to_cutting_bertahap_and_undo(): void
    {
        $article = $this->article();
        $admin = $this->warehouseAdmin();

        $this->actingAs($admin)->post(route('work-orders.store'), [
            'number' => 'LOKA 503',
            'ordered_at' => '2026-10-01',
            'items' => [
                ['article_id' => $article->id, 'color' => 'Navy', 'size' => 'M', 'item_type' => 'print', 'planned_qty' => 20],
            ],
        ])->assertSessionHasNoErrors();

        $wo = WorkOrder::query()->with('items')->where('number', 'LOKA 503')->sole();
        $item = $wo->items->sole();

        // Transfer 8 pcs to cutting
        $this->actingAs($admin)->post(route('cutting-receipts.store', $item), [
            'qty' => 8,
            'notes' => 'Batch 1 print',
        ])->assertSessionHasNoErrors();

        $item->refresh();
        $this->assertSame(12, $item->printingQty());
        $this->assertSame(8, $item->cuttingPendingQty());

        $receipt = CuttingReceipt::query()->sole();
        $this->assertSame(8, $receipt->qty);

        // Cannot undo if goods already entered warehouse
        $item->update(['received_qty' => 8]);
        $this->actingAs($admin)->delete(route('cutting-receipts.destroy', $receipt))
            ->assertSessionHasErrors('receipt');

        // Can undo if not received into warehouse yet
        $item->update(['received_qty' => 0]);
        $this->actingAs($admin)->delete(route('cutting-receipts.destroy', $receipt))
            ->assertSessionHasNoErrors();

        $this->assertSame(20, $item->refresh()->printingQty());
        $this->assertSame(0, $item->cuttingPendingQty());
    }

    public function test_tailor_vs_makloon_separation_in_summary_and_item(): void
    {
        $admin = $this->warehouseAdmin();
        $item = $this->readyItem(qty: 20);

        $internalTailor = $this->tailor(TailorType::Internal, 'Bu Siti');
        $makloonTailor = $this->tailor(TailorType::Makloon, 'Makloon Berkah');

        // Internal takes 6 pcs
        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $internalTailor->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 6]],
        ])->assertSessionHasNoErrors();

        // Makloon takes 8 pcs
        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $makloonTailor->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 8]],
        ])->assertSessionHasNoErrors();

        $item->refresh();
        $this->assertSame(6, $item->internalSewingQty());
        $this->assertSame(8, $item->makloonSewingQty());
        $this->assertSame(14, $item->sewingQty());
        $this->assertSame(6, $item->availableQty()); // 20 - 14 = 6

        // Check presenter output
        $presenter = app(WorkOrderPresenter::class);
        $summary = $presenter->summary($item->workOrder);
        $this->assertSame(6, $summary['sewing_internal_qty']);
        $this->assertSame(8, $summary['sewing_makloon_qty']);
        $this->assertSame(14, $summary['sewing_qty']);
        $this->assertSame(6, $summary['available_qty']);
    }

    public function test_can_edit_cutting_receipt_qty(): void
    {
        $admin = $this->warehouseAdmin();
        $article = $this->article();

        $this->actingAs($admin)->post(route('work-orders.store'), [
            'number' => 'LOKA 601',
            'items' => [
                ['article_id' => $article->id, 'color' => 'Navy', 'size' => 'M', 'item_type' => 'print', 'planned_qty' => 10],
            ],
        ])->assertSessionHasNoErrors();

        $item = WorkOrder::query()->where('number', 'LOKA 601')->sole()->items()->sole();

        $this->actingAs($admin)->post(route('cutting-receipts.store', $item), ['qty' => 5])
            ->assertSessionHasNoErrors();
        $receipt = CuttingReceipt::query()->sole();
        $this->assertSame(5, $receipt->qty);
        $this->assertSame(5, $item->refresh()->cutting_qty);

        // Edit receipt from 5 to 7
        $this->actingAs($admin)->patch(route('cutting-receipts.update', $receipt), ['qty' => 7])
            ->assertSessionHasNoErrors();
        $this->assertSame(7, $receipt->refresh()->qty);
        $this->assertSame(7, $item->refresh()->cutting_qty);
    }

    public function test_can_edit_hancaan_receipt_qty(): void
    {
        $admin = $this->warehouseAdmin();
        $article = $this->article();

        $this->actingAs($admin)->post(route('work-orders.store'), [
            'number' => 'LOKA 602',
            'items' => [
                ['article_id' => $article->id, 'color' => 'Navy', 'size' => 'M', 'item_type' => 'polosan', 'planned_qty' => 10],
            ],
        ])->assertSessionHasNoErrors();

        $item = WorkOrder::query()->where('number', 'LOKA 602')->sole()->items()->sole();

        $this->actingAs($admin)->post(route('hancaan-receipts.store', $item), ['qty' => 4])
            ->assertSessionHasNoErrors();
        $receipt = HancaanReceipt::query()->sole();
        $this->assertSame(4, $receipt->qty);
        $this->assertSame(4, $item->refresh()->received_qty);

        // Edit receipt from 4 to 6
        $this->actingAs($admin)->patch(route('hancaan-receipts.update', $receipt), ['qty' => 6])
            ->assertSessionHasNoErrors();
        $this->assertSame(6, $receipt->refresh()->qty);
        $this->assertSame(6, $item->refresh()->received_qty);
    }
}
