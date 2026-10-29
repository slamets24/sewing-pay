<?php

namespace Tests\Feature\Sewing;

use App\Enums\PickupItemStatus;
use App\Enums\TailorType;
use App\Enums\WorkOrderItemStage;
use App\Models\PickupItem;
use App\Models\SewingDelivery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PickupDeliveryTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    public function test_one_pickup_can_take_several_lines_and_freezes_the_rate(): void
    {
        $admin = $this->warehouseAdmin();
        $first = $this->readyItem(qty: 5, article: $this->article('Marina', 7000));
        $second = $this->readyItem(qty: 5, article: $this->article('Vella', 6000));
        $tailor = $this->tailor();

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $tailor->id,
            'items' => [
                ['work_order_item_id' => $first->id, 'qty' => 1],
                ['work_order_item_id' => $second->id, 'qty' => 3],
            ],
        ])->assertSessionHasNoErrors()->assertRedirect(route('deliveries.index'));

        $first->article->update(['sewing_rate' => 9000]);

        $this->assertSame(7000, PickupItem::query()->where('work_order_item_id', $first->id)->value('sewing_rate'));
        $this->assertSame(3, $second->refresh()->assigned_qty);
        $this->assertSame(2, $second->availableQty());
    }

    public function test_pickup_cannot_exceed_warehouse_stock(): void
    {
        $item = $this->readyItem(qty: 2);

        $this->actingAs($this->warehouseAdmin())->post(route('pickups.store'), [
            'tailor_id' => $this->tailor()->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 3]],
        ])->assertSessionHasErrors('items');

        $this->assertSame(0, $item->refresh()->assigned_qty);
    }

    public function test_makloon_pickup_is_tracked_without_pay(): void
    {
        $admin = $this->warehouseAdmin();
        $item = $this->readyItem(qty: 4);

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $this->tailor(TailorType::Makloon, 'Makloon Berkah')->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 4]],
        ]);

        $pickupItem = PickupItem::query()->sole();
        $this->assertSame(0, $pickupItem->sewing_rate);

        $this->actingAs($admin)->post(route('deliveries.store', $pickupItem), ['qty' => 4])->assertSessionHasNoErrors();

        $delivery = SewingDelivery::query()->sole();
        $this->assertFalse($delivery->is_payable);
        $this->assertSame(0, $delivery->subtotal);
    }

    public function test_delivery_updates_counters_and_can_be_undone(): void
    {
        $admin = $this->warehouseAdmin();
        $item = $this->readyItem(qty: 3);

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $this->tailor()->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 3]],
        ]);
        $pickupItem = PickupItem::query()->sole();

        $this->actingAs($admin)->post(route('deliveries.store', $pickupItem), ['qty' => 4])->assertSessionHasErrors('qty');
        $this->actingAs($admin)->post(route('deliveries.store', $pickupItem), ['qty' => 3])->assertSessionHasNoErrors();

        $delivery = SewingDelivery::query()->sole();
        $this->assertSame(21000, $delivery->subtotal);
        $this->assertSame(PickupItemStatus::Done, $pickupItem->refresh()->status);
        $this->assertSame(WorkOrderItemStage::Done, $item->refresh()->stage());

        $this->actingAs($admin)->delete(route('deliveries.destroy', $delivery))->assertSessionHasNoErrors();

        $this->assertModelMissing($delivery);
        $this->assertSame(PickupItemStatus::Open, $pickupItem->refresh()->status);
        $this->assertSame(0, $item->refresh()->delivered_qty);
        $this->assertSame(WorkOrderItemStage::Sewing, $item->stage());
    }

    public function test_pickup_item_can_be_cancelled_only_before_any_delivery(): void
    {
        $admin = $this->warehouseAdmin();
        $item = $this->readyItem(qty: 5);

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $this->tailor()->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 5]],
        ]);
        $pickupItem = PickupItem::query()->sole();

        $this->actingAs($admin)->post(route('deliveries.store', $pickupItem), ['qty' => 1]);
        $this->actingAs($admin)->post(route('pickup-items.cancel', $pickupItem))->assertSessionHasErrors('pickup_item');

        $this->actingAs($admin)->delete(route('deliveries.destroy', SewingDelivery::query()->sole()))->assertSessionHasNoErrors();

        $this->actingAs($admin)->post(route('pickup-items.cancel', $pickupItem))->assertSessionHasNoErrors();

        $this->assertSame(PickupItemStatus::Cancelled, $pickupItem->refresh()->status);
        $this->assertSame(5, $item->refresh()->availableQty());
    }

    public function test_quick_desk_page_renders_successfully(): void
    {
        $admin = $this->warehouseAdmin();
        $this->tailor();
        $this->readyItem(qty: 4);

        $this->actingAs($admin)
            ->get(route('desk.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Desk/Index')
                ->has('tailors')
                ->has('board')
                ->has('availableItems')
            );
    }

    public function test_tailor_batch_delivery_delivers_all_open_items_at_once(): void
    {
        $admin = $this->warehouseAdmin();
        $tailor = $this->tailor();
        $first = $this->readyItem(qty: 5, article: $this->article('Kemeja', 8000));
        $second = $this->readyItem(qty: 4, article: $this->article('Celana', 6000));

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $tailor->id,
            'items' => [
                ['work_order_item_id' => $first->id, 'qty' => 5],
                ['work_order_item_id' => $second->id, 'qty' => 4],
            ],
        ])->assertSessionHasNoErrors();

        $this->assertSame(2, PickupItem::query()->where('tailor_id', $tailor->id)->count());

        $this->actingAs($admin)
            ->post(route('deliveries.batch-tailor', $tailor))
            ->assertSessionHasNoErrors()
            ->assertSessionHas('status');

        $this->assertSame(9, SewingDelivery::query()->where('tailor_id', $tailor->id)->sum('qty'));
        $this->assertSame(0, PickupItem::query()->where('tailor_id', $tailor->id)->where('status', PickupItemStatus::Open)->count());
    }

    public function test_pickup_from_desk_redirects_back_to_quick_desk(): void
    {
        $admin = $this->warehouseAdmin();
        $tailor = $this->tailor();
        $item = $this->readyItem(qty: 10);

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $tailor->id,
            'from_desk' => true,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 7]],
        ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('desk.index', ['tailor' => $tailor->id]));

        $this->assertSame(7, PickupItem::query()->sole()->qty);
    }
}
