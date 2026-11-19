<?php

namespace Tests\Feature\Sewing;

use App\Enums\RevisionStatus;
use App\Enums\TailorType;
use App\Models\Payout;
use App\Models\PayoutSlip;
use App\Models\PickupItem;
use App\Models\Revision;
use App\Models\RevisionPart;
use App\Models\SewingDelivery;
use App\Models\TailorAttendance;
use App\Models\WorkOrder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

/** Regression tests for the bugs found in the November 2026 audit. */
class AuditRegressionTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    private function part(): RevisionPart
    {
        return RevisionPart::create(['name' => 'Badan', 'price' => 8000, 'material_type' => 'print', 'is_active' => true]);
    }

    private function attendanceData(int $tailorId, array $overrides = []): array
    {
        return [
            'tailor_id' => $tailorId,
            'date' => '2026-11-10',
            'working_hours' => 9,
            'status' => 'present',
            'clock_in' => null,
            'clock_out' => null,
            'note' => null,
            ...$overrides,
        ];
    }

    private function reportReturnedRevision(PickupItem $pickupItem, int $qty): Revision
    {
        $this->post(route('revisions.store'), [
            'type' => 'material',
            'found_at' => 'sewing',
            'pickup_item_id' => $pickupItem->id,
            'revision_part_id' => $this->part()->id,
            'qty' => $qty,
            'return_to_warehouse' => true,
        ])->assertSessionHasNoErrors();

        return Revision::query()->latest('id')->firstOrFail();
    }

    public function test_returned_revision_can_start_when_tailor_holds_nothing_else(): void
    {
        $this->actingAs($this->warehouseAdmin());
        $item = $this->readyItem(qty: 1, article: $this->article(rate: 7000));
        $tailor = $this->tailor();
        $this->post(route('pickups.store'), ['tailor_id' => $tailor->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 1]]]);
        $revision = $this->reportReturnedRevision(PickupItem::query()->sole(), 1);

        $this->post(route('revisions.advance', $revision))->assertSessionHasNoErrors(); // bahan datang
        $this->post(route('revisions.advance', $revision))->assertSessionHasNoErrors(); // mulai dikerjakan

        $revision->refresh();
        $this->assertSame(RevisionStatus::InProgress, $revision->status);
        $this->assertSame(7000, $revision->pickupItem->sewing_rate);
        $this->assertSame(1, $item->refresh()->assigned_qty);
    }

    public function test_returned_piece_taken_by_someone_else_is_not_assigned_twice(): void
    {
        $this->actingAs($this->warehouseAdmin());
        $item = $this->readyItem(qty: 2);
        $a = $this->tailor(name: 'A');
        $b = $this->tailor(name: 'B');
        $this->post(route('pickups.store'), ['tailor_id' => $a->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 2]]]);
        $revision = $this->reportReturnedRevision(PickupItem::query()->sole(), 1);

        $this->post(route('revisions.advance', $revision)); // bahan datang: the piece is back in the warehouse
        $this->post(route('pickups.store'), ['tailor_id' => $b->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 1]]]);

        $this->post(route('revisions.advance', $revision))->assertSessionHasErrors('revision');

        $item->refresh();
        $this->assertSame(2, $item->assigned_qty);
        $this->assertSame(RevisionStatus::MaterialReady, $revision->refresh()->status);
    }

    public function test_revision_closes_only_after_all_its_pieces_are_deposited(): void
    {
        $this->actingAs($this->warehouseAdmin());
        $item = $this->readyItem(qty: 3);
        $tailor = $this->tailor();
        $this->post(route('pickups.store'), ['tailor_id' => $tailor->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 3]]]);
        $pickupItem = PickupItem::query()->sole();
        $this->post(route('revisions.store'), ['type' => 'material', 'found_at' => 'sewing', 'pickup_item_id' => $pickupItem->id, 'revision_part_id' => $this->part()->id, 'qty' => 2, 'return_to_warehouse' => false]);
        $revision = Revision::query()->sole();
        $this->post(route('revisions.advance', $revision));
        $this->post(route('revisions.advance', $revision));

        $this->post(route('deliveries.store', $pickupItem), ['qty' => 1])->assertSessionHasNoErrors();
        $this->assertSame(RevisionStatus::InProgress, $revision->refresh()->status);

        $this->post(route('deliveries.store', $pickupItem), ['qty' => 1])->assertSessionHasNoErrors();
        $this->assertSame(RevisionStatus::InProgress, $revision->refresh()->status);

        $this->post(route('deliveries.store', $pickupItem), ['qty' => 1])->assertSessionHasNoErrors();
        $this->assertSame(RevisionStatus::Done, $revision->refresh()->status);
    }

    public function test_only_owner_can_override_sewing_rate_on_pickup(): void
    {
        $item = $this->readyItem(qty: 2, article: $this->article(rate: 7000));
        $tailor = $this->tailor();

        $this->actingAs($this->warehouseAdmin())->post(route('pickups.store'), ['tailor_id' => $tailor->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 1, 'sewing_rate' => 999999]]]);
        $this->assertSame(7000, PickupItem::query()->latest('id')->first()->sewing_rate);

        $this->actingAs($this->owner())->post(route('pickups.store'), ['tailor_id' => $tailor->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 1, 'sewing_rate' => 8000]]]);
        $this->assertSame(8000, PickupItem::query()->latest('id')->first()->sewing_rate);
    }

    public function test_undo_of_makloon_delivery_already_paid_shows_a_message(): void
    {
        $this->actingAs($this->owner());
        $item = $this->readyItem(qty: 5);
        $makloon = $this->tailor(type: TailorType::Makloon, name: 'Maklun');
        $this->post(route('pickups.store'), ['tailor_id' => $makloon->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 5]]]);
        $this->post(route('deliveries.store', PickupItem::query()->sole()), ['qty' => 5]);
        $delivery = SewingDelivery::query()->sole();
        $this->post(route('makloon-payments.store'), ['tailor_id' => $makloon->id, 'delivery_ids' => [$delivery->id]])->assertSessionHasNoErrors();

        $this->delete(route('deliveries.destroy', $delivery))->assertSessionHasErrors('delivery');
        $this->assertModelExists($delivery);
    }

    public function test_attendance_on_a_slip_cannot_be_deleted(): void
    {
        $this->actingAs($this->owner());
        $attendance = TailorAttendance::create(['tailor_id' => $this->tailor()->id, 'date' => '2026-11-10', 'working_hours' => 9, 'meal_allowance' => 30000, 'status' => 'present']);
        $this->post(route('payouts.store'), ['cutoff_date' => '2026-11-15'])->assertSessionHasNoErrors();

        $this->delete(route('attendances.destroy', $attendance))->assertSessionHasErrors('attendance');
        $this->assertModelExists($attendance);
    }

    public function test_attendance_on_a_paid_slip_is_locked_but_draft_can_be_edited(): void
    {
        $this->actingAs($this->owner());
        $tailor = $this->tailor();
        TailorAttendance::create(['tailor_id' => $tailor->id, 'date' => '2026-11-10', 'working_hours' => 9, 'meal_allowance' => 30000, 'status' => 'present']);
        $this->post(route('payouts.store'), ['cutoff_date' => '2026-11-15']);

        $this->post(route('attendances.store'), $this->attendanceData($tailor->id, ['working_hours' => 10]))->assertSessionHasNoErrors();

        $this->post(route('payouts.paid', Payout::query()->sole()));
        $this->post(route('attendances.store'), $this->attendanceData($tailor->id, ['working_hours' => 12, 'meal_allowance' => 500000]))->assertSessionHasErrors('attendance');
        $this->assertSame(10, TailorAttendance::query()->sole()->working_hours);
    }

    public function test_attendance_is_for_internal_tailors_only_and_makloon_gets_no_meal_allowance(): void
    {
        $this->actingAs($this->owner());
        $makloon = $this->tailor(type: TailorType::Makloon, name: 'Maklun');

        $this->post(route('attendances.store'), $this->attendanceData($makloon->id))->assertSessionHasErrors('tailor_id');

        // A row that already exists (e.g. the tailor was internal before) must not be paid on the internal run.
        TailorAttendance::create(['tailor_id' => $makloon->id, 'date' => '2026-11-10', 'working_hours' => 9, 'meal_allowance' => 30000, 'status' => 'present']);
        $this->post(route('payouts.store'), ['cutoff_date' => '2026-11-15']);
        $this->assertSame(0, PayoutSlip::query()->where('tailor_id', $makloon->id)->count());
    }

    public function test_attendance_without_optional_fields_and_with_bad_date_does_not_crash(): void
    {
        $this->actingAs($this->warehouseAdmin());
        $tailor = $this->tailor();

        $this->post(route('attendances.store'), ['tailor_id' => $tailor->id, 'date' => '2026-11-10', 'working_hours' => 9, 'status' => 'present'])->assertSessionHasNoErrors();
        $this->post(route('attendances.store'), ['tailor_id' => $tailor->id, 'date' => '2026-11-10', 'working_hours' => 9, 'status' => 'present', 'clock_in' => 'jam8'])->assertSessionHasErrors('clock_in');
        $this->get('/absensi?date=xyz')->assertOk();
    }

    public function test_planned_qty_cannot_go_below_what_already_moved_on(): void
    {
        $this->actingAs($this->warehouseAdmin());
        $item = $this->readyItem(qty: 10);

        $this->patch(route('work-order-items.update', $item), ['planned_qty' => 3])->assertSessionHasErrors('planned_qty');
        $this->patch(route('work-order-items.update', $item), ['planned_qty' => 12])->assertSessionHasNoErrors();
        $this->assertSame(12, $item->refresh()->planned_qty);
    }

    public function test_batch_delivery_validates_its_date(): void
    {
        $this->actingAs($this->warehouseAdmin());
        $item = $this->readyItem(qty: 1);
        $tailor = $this->tailor();
        $this->post(route('pickups.store'), ['tailor_id' => $tailor->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 1]]]);

        $this->post(route('deliveries.batch-tailor', $tailor), ['delivered_at' => 'bukan-tanggal'])->assertSessionHasErrors('delivered_at');
    }

    public function test_reassign_rejects_inactive_tailor_and_runs_through_the_action(): void
    {
        $this->actingAs($this->warehouseAdmin());
        $item = $this->readyItem(qty: 2);
        $a = $this->tailor(name: 'A');
        $b = $this->tailor(name: 'B');
        $inactive = $this->tailor(name: 'C');
        $inactive->update(['is_active' => false]);
        $this->post(route('pickups.store'), ['tailor_id' => $a->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 2]]]);
        $this->post(route('revisions.store'), ['type' => 'material', 'found_at' => 'sewing', 'pickup_item_id' => PickupItem::query()->sole()->id, 'revision_part_id' => $this->part()->id, 'qty' => 1, 'return_to_warehouse' => false]);
        $revision = Revision::query()->sole();

        $this->post(route('revisions.reassign', $revision), ['tailor_id' => $inactive->id])->assertSessionHasErrors('tailor_id');
        $this->post(route('revisions.reassign', $revision), ['tailor_id' => $b->id])->assertSessionHasNoErrors();

        $revision->refresh();
        $this->assertSame($b->id, $revision->tailor_id);
        $this->assertSame($b->id, $revision->pickupItem->tailor_id);
        $this->assertSame(1, PickupItem::query()->where('tailor_id', $a->id)->sole()->qty);
    }

    public function test_batch_transfer_skips_zero_lines_and_rejects_lines_from_another_wo(): void
    {
        $this->actingAs($this->warehouseAdmin());
        $workOrder = WorkOrder::create(['number' => 'WO-BATCH', 'ordered_at' => today()]);
        $article = $this->article();
        $a = $workOrder->items()->create(['article_id' => $article->id, 'color' => 'Black', 'size' => 'M', 'planned_qty' => 5]);
        $b = $workOrder->items()->create(['article_id' => $article->id, 'color' => 'Black', 'size' => 'L', 'planned_qty' => 3]);
        $other = $this->readyItem(qty: 2);

        $this->post(route('cutting-receipts.batch', $workOrder), ['items' => [
            ['work_order_item_id' => $a->id, 'qty' => 5],
            ['work_order_item_id' => $b->id, 'qty' => 0],
        ]])->assertSessionHasNoErrors();
        $this->assertSame(5, $a->refresh()->cutting_qty);
        $this->assertSame(0, $b->refresh()->cutting_qty);

        $this->post(route('hancaan-receipts.batch', $workOrder), ['items' => [
            ['work_order_item_id' => $other->id, 'qty' => 1],
        ]])->assertSessionHasErrors('items.0.work_order_item_id');
    }

    public function test_work_order_page_reports_pieces_sent_to_qc(): void
    {
        $this->actingAs($this->warehouseAdmin());
        $item = $this->readyItem(qty: 5);
        $tailor = $this->tailor();
        $this->post(route('pickups.store'), ['tailor_id' => $tailor->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 5]]]);
        $pickupItem = PickupItem::query()->sole();
        $this->post(route('deliveries.store', $pickupItem), ['qty' => 3]);
        $this->post(route('deliveries.store', $pickupItem), ['qty' => 2]);
        $this->post(route('qc-shipments.store'), ['delivery_ids' => [SewingDelivery::query()->oldest('id')->value('id')]])->assertSessionHasNoErrors();

        $this->get(route('work-orders.show', $item->work_order_id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('workOrder.delivered_qty', 5)
                ->where('workOrder.qc_qty', 3)
                ->where('workOrder.items.0.qc_qty', 3));

        $this->get(route('work-orders.index', ['status' => 'all']))
            ->assertInertia(fn ($page) => $page->where('workOrders.0.qc_qty', 3));
    }

    public function test_user_seeder_refuses_to_use_the_default_password_in_production(): void
    {
        config(['sewing.seed_user_password' => null]);
        $this->app['env'] = 'production';

        $this->expectException(RuntimeException::class);
        $this->app->make(UserSeeder::class)->run();
    }
}
