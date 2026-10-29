<?php

namespace Tests\Feature\Sewing;

use App\Enums\RevisionStatus;
use App\Enums\RevisionType;
use App\Enums\TailorType;
use App\Enums\WorkOrderItemStage;
use App\Models\PickupItem;
use App\Models\QcShipment;
use App\Models\Revision;
use App\Models\RevisionPart;
use App\Models\SewingDelivery;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QcRevisionTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    private function deliver(int $qty = 4): SewingDelivery
    {
        $admin = $this->warehouseAdmin();
        $item = $this->readyItem(qty: $qty);

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $this->tailor()->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => $qty]],
        ]);
        $this->actingAs($admin)->post(route('deliveries.store', PickupItem::query()->sole()), ['qty' => $qty]);

        return SewingDelivery::query()->sole();
    }

    public function test_shipping_to_qc_bundles_deliveries_and_blocks_undo(): void
    {
        $delivery = $this->deliver();
        $admin = $this->warehouseAdmin();

        $this->actingAs($admin)
            ->post(route('qc-shipments.store'), ['delivery_ids' => [$delivery->id]])
            ->assertRedirect(route('qc-shipments.labels', QcShipment::query()->sole()));

        $this->assertNotNull($delivery->refresh()->qc_shipment_id);
        $this->actingAs($admin)->post(route('qc-shipments.store'), ['delivery_ids' => [$delivery->id]])->assertSessionHasErrors('delivery_ids');
        $this->actingAs($admin)->delete(route('deliveries.destroy', $delivery))->assertSessionHasErrors('delivery');
        $this->actingAs($admin)->get(route('qc-shipments.labels', QcShipment::query()->sole()))->assertOk();
    }

    public function test_revisions_reported_by_qc_are_free_for_sewing_and_priced_for_material(): void
    {
        $delivery = $this->deliver();
        $part = RevisionPart::create(['name' => 'Badan Depan', 'price' => 10000, 'material_type' => 'print', 'is_active' => true]);
        $admin = $this->warehouseAdmin();

        $fromQc = fn (array $data) => $this->actingAs($admin)->post(route('revisions.store'), [
            'found_at' => 'qc',
            'sewing_delivery_id' => $delivery->id,
            ...$data,
        ]);

        $fromQc(['type' => 'sewing', 'qty' => 1])->assertSessionHasErrors('sewing_delivery_id');

        $this->actingAs($admin)->post(route('qc-shipments.store'), ['delivery_ids' => [$delivery->id]]);

        $fromQc(['type' => 'sewing', 'qty' => 1])->assertSessionHasNoErrors();
        $fromQc(['type' => 'material', 'revision_part_id' => $part->id, 'qty' => 2])->assertSessionHasNoErrors();

        $sewing = Revision::query()->where('type', RevisionType::Sewing->value)->sole();
        $material = Revision::query()->where('type', RevisionType::Material->value)->sole();

        $this->assertSame(0, $sewing->subtotal);
        $this->assertSame(RevisionStatus::InProgress, $sewing->status);
        $this->assertSame($delivery->tailor_id, $sewing->tailor_id);
        $this->assertSame(20000, $material->subtotal);
        $this->assertSame(RevisionStatus::WaitingMaterial, $material->status);
    }

    public function test_qc_staff_cannot_access_the_application(): void
    {
        $qc = User::factory()->qc()->create();

        $this->actingAs($qc)->get('/')->assertRedirect(route('login'));
        $this->actingAs($qc)->get(route('revisions.index'))->assertForbidden();
        $this->actingAs($qc)->get(route('qc-shipments.index'))->assertForbidden();
    }

    public function test_material_revision_walks_its_statuses_and_can_change_tailor_before_work_starts(): void
    {
        $delivery = $this->deliver();
        $part = RevisionPart::create(['name' => 'Ganti Kerah', 'price' => 5000, 'material_type' => 'print', 'is_active' => true]);
        $admin = $this->warehouseAdmin();

        $this->actingAs($admin)->post(route('revisions.store'), [
            'type' => 'material',
            'found_at' => 'sewing',
            'sewing_delivery_id' => $delivery->id,
            'revision_part_id' => $part->id,
            'qty' => 2,
        ])->assertSessionHasNoErrors();

        $revision = Revision::query()->sole();
        $makloon = $this->tailor(TailorType::Makloon, 'Makloon Jaya');

        $this->actingAs($admin)->post(route('revisions.advance', $revision))->assertSessionHasNoErrors();
        $this->assertSame(RevisionStatus::MaterialReady, $revision->refresh()->status);

        $this->actingAs($admin)->post(route('revisions.advance', $revision), ['tailor_id' => $makloon->id])->assertSessionHasNoErrors();
        $revision->refresh();
        $this->assertSame(RevisionStatus::InProgress, $revision->status);
        $this->assertSame($makloon->id, $revision->tailor_id);
        $this->assertSame(0, $revision->subtotal);

        $this->actingAs($admin)->post(route('revisions.advance', $revision), ['tailor_id' => $delivery->tailor_id])->assertSessionHasErrors('tailor_id');
        $this->actingAs($admin)->post(route('revisions.advance', $revision))->assertSessionHasNoErrors();
        $this->assertSame(RevisionStatus::Done, $revision->refresh()->status);
        $this->assertNotNull($revision->completed_at);

        $this->actingAs($admin)->post(route('revisions.advance', $revision))->assertSessionHasErrors('revision');
    }

    public function test_material_defect_found_while_sewing_can_stay_with_the_tailor(): void
    {
        $admin = $this->warehouseAdmin();
        $item = $this->readyItem(qty: 3);
        $part = RevisionPart::create(['name' => 'Badan Depan', 'price' => 10000, 'material_type' => 'print', 'is_active' => true]);

        $this->actingAs($admin)->post(route('pickups.store'), ['tailor_id' => $this->tailor()->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 3]]]);
        $pickupItem = PickupItem::query()->sole();

        $this->actingAs($admin)->post(route('revisions.store'), [
            'type' => 'material',
            'found_at' => 'sewing',
            'pickup_item_id' => $pickupItem->id,
            'revision_part_id' => $part->id,
            'qty' => 1,
            'return_to_warehouse' => false,
        ])->assertSessionHasNoErrors();

        $this->assertSame(3, $pickupItem->refresh()->remainingQty());
        $this->assertSame(0, $item->refresh()->holdQty());
        $this->assertSame($pickupItem->tailor_id, Revision::query()->sole()->tailor_id);
    }

    public function test_material_defect_handed_back_is_blocked_in_the_warehouse_until_material_arrives(): void
    {
        $admin = $this->warehouseAdmin();
        $item = $this->readyItem(qty: 3);
        $part = RevisionPart::create(['name' => 'Badan Depan', 'price' => 10000, 'material_type' => 'print', 'is_active' => true]);

        $this->actingAs($admin)->post(route('pickups.store'), ['tailor_id' => $this->tailor()->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 3]]]);
        $pickupItem = PickupItem::query()->sole();

        $this->actingAs($admin)->post(route('revisions.store'), [
            'type' => 'material',
            'found_at' => 'sewing',
            'pickup_item_id' => $pickupItem->id,
            'revision_part_id' => $part->id,
            'qty' => 2,
            'return_to_warehouse' => true,
        ])->assertSessionHasNoErrors();

        $item->refresh();
        $this->assertSame(1, $pickupItem->refresh()->remainingQty());
        $this->assertSame(2, $item->holdQty());
        $this->assertSame(0, $item->availableQty());
        $this->assertSame(WorkOrderItemStage::Sewing, $item->stage());

        $revision = Revision::query()->sole();
        $this->assertTrue($revision->isHoldingStock());

        $this->actingAs($admin)->post(route('revisions.advance', $revision))->assertSessionHasNoErrors();

        $item->refresh();
        $this->assertSame(0, $item->holdQty());
        $this->assertSame(2, $item->availableQty());
        $this->assertFalse($revision->refresh()->isHoldingStock());
    }

    public function test_sewing_revision_cannot_be_handed_back(): void
    {
        $admin = $this->warehouseAdmin();
        $item = $this->readyItem(qty: 2);

        $this->actingAs($admin)->post(route('pickups.store'), ['tailor_id' => $this->tailor()->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 2]]]);

        $this->actingAs($admin)->post(route('revisions.store'), [
            'type' => 'sewing',
            'found_at' => 'sewing',
            'pickup_item_id' => PickupItem::query()->sole()->id,
            'qty' => 1,
            'return_to_warehouse' => true,
        ])->assertSessionHasErrors('return_to_warehouse');

        $this->assertSame(0, $item->refresh()->holdQty());
    }

    public function test_revision_qty_cannot_exceed_the_delivery(): void
    {
        $delivery = $this->deliver(qty: 2);
        $admin = $this->warehouseAdmin();
        $this->actingAs($admin)->post(route('qc-shipments.store'), ['delivery_ids' => [$delivery->id]]);

        $this->actingAs($admin)->post(route('revisions.store'), [
            'type' => 'sewing',
            'found_at' => 'qc',
            'sewing_delivery_id' => $delivery->id,
            'qty' => 3,
        ])->assertSessionHasErrors('qty');
    }
}
