<?php

namespace Tests\Feature\Sewing;

use App\Models\Payout;
use App\Models\Pickup;
use App\Models\PickupItem;
use App\Models\SewingDelivery;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurgeWorkOrderTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    /** WO dengan 5 pcs di gudang, 3 diambil penjahit, 2 sudah disetor. */
    private function runningWorkOrder(): WorkOrderItem
    {
        $admin = $this->warehouseAdmin();
        $tailor = $this->tailor();
        $item = $this->readyItem(qty: 5);

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $tailor->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 3]],
        ]);
        $pickupItem = PickupItem::query()->latest('id')->first();
        $this->actingAs($admin)->post(route('deliveries.store', $pickupItem), ['qty' => 2, 'delivered_at' => '2026-11-10 10:00']);

        return $item;
    }

    public function test_owner_sees_purge_preview_on_running_work_order(): void
    {
        $item = $this->runningWorkOrder();

        $this->actingAs($this->owner())
            ->get(route('work-orders.show', $item->work_order_id))
            ->assertInertia(fn ($page) => $page
                ->where('workOrder.can_delete', false)
                ->where('purge.counts.pickup_qty', 3)
                ->where('purge.counts.delivered_qty', 2)
                ->where('purge.blockers', []));

        $this->actingAs($this->warehouseAdmin())
            ->get(route('work-orders.show', $item->work_order_id))
            ->assertInertia(fn ($page) => $page->where('purge', null));
    }

    public function test_owner_can_purge_running_work_order_with_confirmation(): void
    {
        $item = $this->runningWorkOrder();
        $workOrder = $item->workOrder;

        $this->actingAs($this->owner())
            ->delete(route('work-orders.purge', $workOrder), ['confirm_number' => 'salah'])
            ->assertSessionHasErrors('confirm_number');
        $this->assertDatabaseHas('work_orders', ['id' => $workOrder->id]);

        $this->actingAs($this->owner())
            ->delete(route('work-orders.purge', $workOrder), ['confirm_number' => $workOrder->number])
            ->assertRedirect(route('work-orders.index'))
            ->assertSessionHas('status');

        $this->assertDatabaseMissing('work_orders', ['id' => $workOrder->id]);
        $this->assertSame(0, WorkOrderItem::query()->count());
        $this->assertSame(0, PickupItem::query()->count());
        $this->assertSame(0, Pickup::query()->count());
        $this->assertSame(0, SewingDelivery::query()->count());
    }

    public function test_admin_cannot_purge(): void
    {
        $item = $this->runningWorkOrder();

        $this->actingAs($this->warehouseAdmin())
            ->delete(route('work-orders.purge', $item->work_order_id), ['confirm_number' => $item->workOrder->number])
            ->assertForbidden();

        $this->assertDatabaseHas('work_orders', ['id' => $item->work_order_id]);
    }

    public function test_purge_is_blocked_while_deliveries_sit_in_a_payout(): void
    {
        $item = $this->runningWorkOrder();
        $owner = $this->owner();

        $this->actingAs($owner)->post(route('payouts.store'), ['cutoff_date' => '2026-11-15'])->assertSessionHasNoErrors();
        $this->assertSame(1, Payout::query()->count());

        $this->actingAs($owner)
            ->delete(route('work-orders.purge', $item->work_order_id), ['confirm_number' => $item->workOrder->number])
            ->assertSessionHasErrors('work_order');

        $this->assertDatabaseHas('work_orders', ['id' => $item->work_order_id]);
        $this->assertSame(1, SewingDelivery::query()->count());
    }

    public function test_purge_keeps_shared_pickups_of_other_work_orders(): void
    {
        $admin = $this->warehouseAdmin();
        $tailor = $this->tailor();
        $first = $this->readyItem(qty: 4);
        $second = $this->readyItem(qty: 4);

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $tailor->id,
            'items' => [
                ['work_order_item_id' => $first->id, 'qty' => 2],
                ['work_order_item_id' => $second->id, 'qty' => 2],
            ],
        ])->assertSessionHasNoErrors();

        $this->actingAs($this->owner())
            ->delete(route('work-orders.purge', $first->work_order_id), ['confirm_number' => $first->workOrder->number])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, Pickup::query()->count());
        $this->assertSame(1, PickupItem::query()->count());
        $this->assertTrue(WorkOrder::query()->whereKey($second->work_order_id)->exists());
    }
}
