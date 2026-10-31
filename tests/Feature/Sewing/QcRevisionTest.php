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

    public function test_revision_can_be_reassigned_to_another_tailor_before_in_progress(): void
    {
        $delivery = $this->deliver();
        $part = RevisionPart::create(['name' => 'Badan Belakang', 'price' => 8000, 'material_type' => 'print', 'is_active' => true]);
        $admin = $this->warehouseAdmin();

        $this->actingAs($admin)->post(route('revisions.store'), [
            'type' => 'material',
            'found_at' => 'sewing',
            'sewing_delivery_id' => $delivery->id,
            'revision_part_id' => $part->id,
            'qty' => 1,
        ])->assertSessionHasNoErrors();

        $revision = Revision::query()->sole();
        $newTailor = $this->tailor(name: 'Pak Budi');

        $this->actingAs($admin)->post(route('revisions.reassign', $revision), [
            'tailor_id' => $newTailor->id,
        ])->assertSessionHasNoErrors();

        $this->assertSame($newTailor->id, $revision->refresh()->tailor_id);
        $this->assertSame(8000, $revision->subtotal);

        // Advance to in_progress
        $this->actingAs($admin)->post(route('revisions.advance', $revision));
        $this->actingAs($admin)->post(route('revisions.advance', $revision));
        $this->assertSame(RevisionStatus::InProgress, $revision->refresh()->status);

        // Cannot reassign once in_progress
        $otherTailor = $this->tailor(name: 'Pak Joko');
        $this->actingAs($admin)->post(route('revisions.reassign', $revision), [
            'tailor_id' => $otherTailor->id,
        ])->assertSessionHasErrors('tailor_id');
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

    public function test_defective_item_kept_by_tailor_reduces_deliverable_qty_and_blocks_delivery(): void
    {
        $admin = $this->warehouseAdmin();
        $part = RevisionPart::create(['name' => 'Badan Depan', 'price' => 10000, 'material_type' => 'print', 'is_active' => true]);
        $item = $this->readyItem(qty: 2);
        $tailor = $this->tailor();

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $tailor->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 2]],
        ]);

        $pickupItem = PickupItem::query()->sole();
        $this->assertSame(2, $pickupItem->remainingQty());
        $this->assertSame(2, $pickupItem->deliverableQty());

        // Report 1 pcs defect, kept by tailor (return_to_warehouse = false)
        $this->actingAs($admin)->post(route('revisions.store'), [
            'type' => 'material',
            'found_at' => 'sewing',
            'pickup_item_id' => $pickupItem->id,
            'revision_part_id' => $part->id,
            'qty' => 1,
            'return_to_warehouse' => false,
        ])->assertSessionHasNoErrors();

        $pickupItem->refresh();
        $this->assertSame(2, $pickupItem->remainingQty());
        $this->assertSame(1, $pickupItem->openRevisionQty());
        $this->assertSame(1, $pickupItem->deliverableQty());

        // Attempting to deliver 2 pcs fails because 1 pcs is defective
        $this->actingAs($admin)->post(route('deliveries.store', $pickupItem), ['qty' => 2])
            ->assertSessionHasErrors('qty');

        // Delivering 1 good pcs succeeds
        $this->actingAs($admin)->post(route('deliveries.store', $pickupItem), ['qty' => 1])
            ->assertSessionHasNoErrors();

        $pickupItem->refresh();
        $this->assertSame(1, $pickupItem->remainingQty());
        $this->assertSame(0, $pickupItem->deliverableQty());

        // Batch delivery fails because 0 pcs are deliverable
        $this->actingAs($admin)->post(route('deliveries.batch-tailor', $tailor->id))
            ->assertSessionHasErrors('general');

        // Advance revision to Done (Bahan Datang -> Dikerjakan -> Selesai)
        $revision = Revision::query()->sole();
        $this->actingAs($admin)->post(route('revisions.advance', $revision))->assertSessionHasNoErrors(); // material_ready
        $this->actingAs($admin)->post(route('revisions.advance', $revision))->assertSessionHasNoErrors(); // in_progress
        $this->actingAs($admin)->post(route('revisions.advance', $revision))->assertSessionHasNoErrors(); // done

        $pickupItem->refresh();
        $this->assertSame(0, $pickupItem->openRevisionQty());
        $this->assertSame(1, $pickupItem->deliverableQty());

        // Now the repaired piece can be delivered!
        $this->actingAs($admin)->post(route('deliveries.store', $pickupItem), ['qty' => 1])
            ->assertSessionHasNoErrors();

        $this->assertSame(0, $pickupItem->refresh()->remainingQty());
    }

    public function test_reassigning_revision_kept_by_tailor_transfers_item(): void
    {
        $admin = $this->warehouseAdmin();
        $part = RevisionPart::create(['name' => 'Badan Depan', 'price' => 10000, 'material_type' => 'print', 'is_active' => true]);
        $item = $this->readyItem(qty: 2);
        $tailor1 = $this->tailor(name: 'Tailor A');
        $tailor2 = $this->tailor(name: 'Tailor B');

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $tailor1->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 2]],
        ]);

        $pickupItem1 = PickupItem::query()->where('tailor_id', $tailor1->id)->sole();

        // Report 1 pcs defect kept by tailor1
        $this->actingAs($admin)->post(route('revisions.store'), [
            'type' => 'material',
            'found_at' => 'sewing',
            'pickup_item_id' => $pickupItem1->id,
            'revision_part_id' => $part->id,
            'qty' => 1,
            'return_to_warehouse' => false,
        ])->assertSessionHasNoErrors();

        $revision = Revision::query()->sole();

        // Reassign revision to tailor2
        $this->actingAs($admin)->post(route('revisions.reassign', $revision), [
            'tailor_id' => $tailor2->id,
        ])->assertSessionHasNoErrors();

        $pickupItem1->refresh();
        $revision->refresh();

        // Tailor 1 now only has 1 pcs
        $this->assertSame(1, $pickupItem1->qty);
        $this->assertSame(0, $pickupItem1->openRevisionQty());
        $this->assertSame(1, $pickupItem1->deliverableQty());

        // Revision is now for tailor 2 and points to tailor 2's new pickup item
        $this->assertSame($tailor2->id, $revision->tailor_id);
        $pickupItem2 = PickupItem::query()->where('tailor_id', $tailor2->id)->sole();
        $this->assertSame($pickupItem2->id, $revision->pickup_item_id);
        $this->assertSame(1, $pickupItem2->qty);
    }

    public function test_material_revision_returned_to_warehouse_moves_to_tailor_on_in_progress_and_completes_on_delivery(): void
    {
        $admin = $this->warehouseAdmin();
        $item = $this->readyItem(qty: 3);
        $part = RevisionPart::create(['name' => 'Badan Belakang', 'price' => 8000, 'material_type' => 'print', 'is_active' => true]);
        $tailor = $this->tailor(name: 'Bu Rini');

        // Tailor takes 3 pcs
        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $tailor->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 3]],
        ]);
        $pickupItem = PickupItem::query()->sole();

        // Report 1 pcs defect handed back to warehouse (return_to_warehouse = true)
        $this->actingAs($admin)->post(route('revisions.store'), [
            'type' => 'material',
            'found_at' => 'sewing',
            'pickup_item_id' => $pickupItem->id,
            'revision_part_id' => $part->id,
            'qty' => 1,
            'return_to_warehouse' => true,
        ])->assertSessionHasNoErrors();

        $pickupItem->refresh();
        $revision = Revision::query()->sole();

        // 1 pcs returned to warehouse, tailor now holds 2 pcs
        $this->assertSame(2, $pickupItem->remainingQty());
        $this->assertTrue($revision->returned_to_warehouse);
        $this->assertSame(RevisionStatus::WaitingMaterial, $revision->status);

        // Advance: Bahan Datang (material_ready)
        $this->actingAs($admin)->post(route('revisions.advance', $revision))->assertSessionHasNoErrors();
        $revision->refresh();
        $this->assertSame(RevisionStatus::MaterialReady, $revision->status);

        // Advance: Mulai Dikerjakan (in_progress) -> piece MUST move to the tailor working on it!
        $this->actingAs($admin)->post(route('revisions.advance', $revision))->assertSessionHasNoErrors();
        $revision->refresh();
        $pickupItem->refresh();

        $this->assertSame(RevisionStatus::InProgress, $revision->status);
        $this->assertFalse($revision->returned_to_warehouse);
        // Tailor now holds 3 pcs again (2 original + 1 repaired)
        $this->assertSame(3, $pickupItem->remainingQty());
        $this->assertSame(3, $pickupItem->deliverableQty());

        // Now tailor setors all 3 pcs at the desk
        $this->actingAs($admin)->post(route('deliveries.store', $pickupItem), ['qty' => 3])
            ->assertSessionHasNoErrors();

        $revision->refresh();
        $pickupItem->refresh();

        // Revision is automatically completed to Done when setor happens!
        $this->assertSame(RevisionStatus::Done, $revision->status);
        $this->assertNotNull($revision->completed_at);
        $this->assertSame(0, $pickupItem->remainingQty());
        $this->assertSame(3, SewingDelivery::query()->sole()->qty);
    }

    public function test_depositing_item_with_in_progress_revision_automatically_completes_revision(): void
    {
        $admin = $this->warehouseAdmin();
        $item = $this->readyItem(qty: 1);
        $part = RevisionPart::create(['name' => 'Badan Belakang', 'price' => 7000, 'material_type' => 'print', 'is_active' => true]);
        $tailor = $this->tailor();

        // Tailor takes 1 pcs
        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $tailor->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 1]],
        ]);
        $pickupItem = PickupItem::query()->sole();

        // Report 1 pcs defect kept by tailor
        $this->actingAs($admin)->post(route('revisions.store'), [
            'type' => 'material',
            'found_at' => 'sewing',
            'pickup_item_id' => $pickupItem->id,
            'revision_part_id' => $part->id,
            'qty' => 1,
            'return_to_warehouse' => false,
        ])->assertSessionHasNoErrors();

        $revision = Revision::query()->sole();

        // While waiting_material: deliverable is 0
        $this->assertSame(0, $pickupItem->refresh()->deliverableQty());

        // Bahan Datang -> Mulai Dikerjakan
        $this->actingAs($admin)->post(route('revisions.advance', $revision))->assertSessionHasNoErrors(); // material_ready
        $this->assertSame(0, $pickupItem->refresh()->deliverableQty());

        $this->actingAs($admin)->post(route('revisions.advance', $revision))->assertSessionHasNoErrors(); // in_progress
        $pickupItem->refresh();
        $revision->refresh();

        $this->assertSame(RevisionStatus::InProgress, $revision->status);
        // In progress: deliverable is 1 pcs! Tailor can now setor directly without clicking Selesai first!
        $this->assertSame(1, $pickupItem->deliverableQty());

        // Setor directly
        $this->actingAs($admin)->post(route('deliveries.store', $pickupItem), ['qty' => 1])
            ->assertSessionHasNoErrors();

        $revision->refresh();
        $this->assertSame(RevisionStatus::Done, $revision->status);
        $this->assertNotNull($revision->completed_at);
        $this->assertSame(7000, $revision->subtotal);
    }
}
