<?php

namespace Tests\Feature\Sewing;

use App\Models\CuttingReceipt;
use App\Models\HancaanReceipt;
use App\Models\PickupItem;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StepBackWorkOrderItemTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    /** Print item: 10 pcs rencana, 6 dikirim ke cutting (2 catatan), 4 jadi hancaan di gudang (2 catatan). */
    private function printItem(): WorkOrderItem
    {
        $admin = $this->warehouseAdmin();
        $workOrder = WorkOrder::create(['number' => 'WO-MUNDUR', 'ordered_at' => today()]);
        $item = $workOrder->items()->create([
            'article_id' => $this->article()->id,
            'color' => 'Black',
            'size' => 'M',
            'item_type' => 'print',
            'planned_qty' => 10,
            'cutting_qty' => 0,
            'received_qty' => 0,
        ]);

        $this->actingAs($admin)->post(route('cutting-receipts.store', $item), ['qty' => 4])->assertSessionHasNoErrors();
        $this->actingAs($admin)->post(route('cutting-receipts.store', $item), ['qty' => 2])->assertSessionHasNoErrors();
        $this->actingAs($admin)->post(route('hancaan-receipts.store', $item), ['qty' => 3])->assertSessionHasNoErrors();
        $this->actingAs($admin)->post(route('hancaan-receipts.store', $item), ['qty' => 1])->assertSessionHasNoErrors();

        return $item->fresh();
    }

    public function test_gudang_back_to_cutting_trims_latest_receipts(): void
    {
        $item = $this->printItem();

        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-order-items.step-back', $item), ['to' => 'cutting', 'qty' => 2])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('status');

        $item->refresh();
        $this->assertSame(2, $item->received_qty);
        $this->assertSame(6, $item->cutting_qty);
        $this->assertSame([2], HancaanReceipt::query()->where('work_order_item_id', $item->id)->pluck('qty')->all());
    }

    public function test_cutting_back_to_printing(): void
    {
        $item = $this->printItem();

        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-order-items.step-back', $item), ['to' => 'printing', 'qty' => 2])
            ->assertSessionHasNoErrors();

        $item->refresh();
        $this->assertSame(4, $item->cutting_qty);
        $this->assertSame(6, $item->printingQty());
        $this->assertSame([4], CuttingReceipt::query()->where('work_order_item_id', $item->id)->pluck('qty')->all());

        // Hanya 2 pcs yang masih di cutting; lebih dari itu ditolak.
        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-order-items.step-back', $item), ['to' => 'printing', 'qty' => 1])
            ->assertSessionHasErrors('qty');
    }

    public function test_cannot_step_back_stock_already_taken_by_tailor(): void
    {
        $item = $this->printItem();
        $tailor = $this->tailor();

        $this->actingAs($this->warehouseAdmin())->post(route('pickups.store'), [
            'tailor_id' => $tailor->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 3]],
        ])->assertSessionHasNoErrors();

        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-order-items.step-back', $item), ['to' => 'cutting', 'qty' => 2])
            ->assertSessionHasErrors('qty');

        // Penjahit → gudang lewat pembatalan ambilan, lalu bisa dimundurkan.
        $this->actingAs($this->warehouseAdmin())->post(route('pickup-items.cancel', PickupItem::query()->firstOrFail()))->assertSessionHasNoErrors();
        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-order-items.step-back', $item), ['to' => 'cutting', 'qty' => 2])
            ->assertSessionHasNoErrors();
    }

    public function test_polosan_cannot_go_back_to_printing(): void
    {
        $item = $this->readyItem(qty: 4);
        $item->update(['item_type' => 'polosan']);

        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-order-items.step-back', $item), ['to' => 'printing', 'qty' => 1])
            ->assertSessionHasErrors('qty');
    }

    public function test_detail_lists_cancellable_pickups(): void
    {
        $item = $this->printItem();
        $tailor = $this->tailor(name: 'Bu Rini');
        $this->actingAs($this->warehouseAdmin())->post(route('pickups.store'), [
            'tailor_id' => $tailor->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 2]],
        ]);

        $this->actingAs($this->warehouseAdmin())
            ->get(route('work-orders.show', $item->work_order_id))
            ->assertInertia(fn ($page) => $page
                ->where('workOrder.items.0.pickups.0.tailor_name', 'Bu Rini')
                ->where('workOrder.items.0.pickups.0.can_cancel', true));
    }
}
