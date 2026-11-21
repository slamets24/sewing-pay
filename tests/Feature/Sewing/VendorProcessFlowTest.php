<?php

namespace Tests\Feature\Sewing;

use App\Enums\Ability;
use App\Enums\TailorType;
use App\Enums\WorkOrderItemStage;
use App\Models\Article;
use App\Models\HancaanReceipt;
use App\Models\VendorJob;
use App\Models\WorkOrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Proses vendor setelah cutting: hancaan masuk gudang → keluar ke vendor (Bordir, Prisket, ...) → masuk gudang lagi → dijahit.
 */
class VendorProcessFlowTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    private const KEY = 'kunci-uji-vendor';

    private function itemWithProcesses(int $qty = 10, array $processes = ['Bordir', 'Prisket']): WorkOrderItem
    {
        $article = $this->article('Gamis Mawar');
        $article->update(['processes' => $processes]);

        return $this->readyItem(qty: $qty, article: $article)->fresh();
    }

    private function send(WorkOrderItem $item, string $process, int $qty, string $vendor = 'CV Maju')
    {
        return $this->actingAs($this->warehouseAdmin())->post(route('vendor-jobs.send', $item->work_order_id), [
            'process' => $process,
            'vendor_name' => $vendor,
            'items' => [['work_order_item_id' => $item->id, 'qty' => $qty]],
        ]);
    }

    private function receive(VendorJob $job, int $qty)
    {
        return $this->actingAs($this->warehouseAdmin())->post(route('vendor-jobs.receive', $job->item->work_order_id), [
            'items' => [['vendor_job_id' => $job->id, 'qty' => $qty]],
        ]);
    }

    private function pickup(WorkOrderItem $item, int $qty)
    {
        return $this->actingAs($this->warehouseAdmin())->post(route('pickups.store'), [
            'tailor_id' => $this->tailor(TailorType::Internal)->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => $qty]],
        ]);
    }

    public function test_new_lines_copy_the_article_processes_and_wait_for_the_vendor(): void
    {
        $item = $this->itemWithProcesses();

        $this->assertSame(['Bordir', 'Prisket'], $item->processList());
        $this->assertSame(0, $item->availableQty());
        $this->assertSame(10, $item->vendorWaitingQty());
        $this->assertSame(WorkOrderItemStage::WaitingVendor, $item->stage());
        $this->assertFalse($item->isDone());

        $this->pickup($item, 1)->assertSessionHasErrors('items');
    }

    public function test_goods_go_through_every_process_in_order_before_sewing(): void
    {
        $item = $this->itemWithProcesses();

        $this->send($item, 'Prisket', 2)->assertSessionHasErrors('items');
        $this->send($item, 'Bordir', 11)->assertSessionHasErrors('items');
        $this->send($item, 'Bordir', 6)->assertSessionHasNoErrors()->assertSessionHas('status');

        $item = $item->fresh();
        $this->assertSame(6, $item->vendorQty());
        $this->assertSame(4, $item->vendorReadyQty('Bordir'));
        $this->assertSame(WorkOrderItemStage::AtVendor, $item->stage());

        $bordir = VendorJob::query()->sole();
        $this->receive($bordir, 7)->assertSessionHasErrors('items');
        $this->receive($bordir, 6)->assertSessionHasNoErrors();

        $item = $item->fresh();
        $this->assertSame(0, $item->vendorQty());
        $this->assertSame(6, $item->vendorReadyQty('Prisket'));
        $this->assertSame(0, $item->availableQty());

        $this->send($item, 'Prisket', 6, 'Prisket Jaya')->assertSessionHasNoErrors();
        $prisket = VendorJob::query()->where('process', 'Prisket')->sole();
        $this->receive($prisket, 6)->assertSessionHasNoErrors();

        $item = $item->fresh();
        $this->assertSame(6, $item->availableQty());
        $this->assertSame(4, $item->vendorWaitingQty());
        $this->assertSame(WorkOrderItemStage::Ready, $item->stage());

        $this->pickup($item, 7)->assertSessionHasErrors('items');
        $this->pickup($item, 6)->assertSessionHasNoErrors();
        $this->assertSame(6, $item->fresh()->assigned_qty);
    }

    public function test_sending_rejects_processes_the_line_does_not_have(): void
    {
        $item = $this->itemWithProcesses(processes: ['Bordir']);

        $this->send($item, 'Sablon', 1)->assertSessionHasErrors('process');
    }

    public function test_cancel_and_undo_are_blocked_once_the_next_step_used_the_goods(): void
    {
        $item = $this->itemWithProcesses();
        $this->send($item, 'Bordir', 5)->assertSessionHasNoErrors();
        $bordir = VendorJob::query()->sole();
        $this->receive($bordir, 5)->assertSessionHasNoErrors();

        $this->actingAs($this->warehouseAdmin())->delete(route('vendor-jobs.destroy', $bordir))->assertSessionHasErrors('vendor_job');

        $this->send($item->fresh(), 'Prisket', 3)->assertSessionHasNoErrors();
        $return = $bordir->returns()->sole();

        $this->actingAs($this->warehouseAdmin())->delete(route('vendor-job-returns.destroy', $return))->assertSessionHasErrors('vendor_job_return');

        $prisket = VendorJob::query()->where('process', 'Prisket')->sole();
        $this->actingAs($this->warehouseAdmin())->delete(route('vendor-jobs.destroy', $prisket))->assertSessionHasNoErrors();
        $this->actingAs($this->warehouseAdmin())->delete(route('vendor-job-returns.destroy', $return))->assertSessionHasNoErrors();

        $this->assertSame(0, $bordir->fresh()->returned_qty);
        $this->actingAs($this->warehouseAdmin())->delete(route('vendor-jobs.destroy', $bordir))->assertSessionHasNoErrors();
        $this->assertSame(0, VendorJob::query()->count());
        $this->assertSame(10, $item->fresh()->vendorWaitingQty());
    }

    public function test_warehouse_corrections_cannot_take_back_goods_already_at_the_vendor(): void
    {
        $item = $this->itemWithProcesses();
        $receipt = $item->receipts()->create(['qty' => 10, 'received_at' => now()]);
        $this->send($item, 'Bordir', 8)->assertSessionHasNoErrors();

        $this->actingAs($this->warehouseAdmin())
            ->patch(route('hancaan-receipts.update', $receipt), ['qty' => 7])
            ->assertSessionHasErrors('qty');
        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-order-items.step-back', $item), ['to' => 'cutting', 'qty' => 3])
            ->assertSessionHasErrors('qty');
        $this->actingAs($this->warehouseAdmin())
            ->post(route('work-order-items.step-back', $item), ['to' => 'cutting', 'qty' => 2])
            ->assertSessionHasNoErrors();

        $this->assertSame(8, $item->fresh()->received_qty);
        $this->assertSame(1, HancaanReceipt::query()->count());
    }

    public function test_article_process_change_reaches_lines_that_have_not_left_the_warehouse(): void
    {
        $item = $this->itemWithProcesses(processes: ['Bordir']);
        $started = $this->readyItem(qty: 5, article: $item->article);
        $this->send($started->fresh(), 'Bordir', 2)->assertSessionHasNoErrors();

        Article::query()->findOrFail($item->article_id)->update(['processes' => ['Sablon']]);

        $this->assertSame(['Sablon'], $item->fresh()->processList());
        $this->assertSame(['Bordir'], $started->fresh()->processList());
    }

    public function test_lines_without_processes_keep_the_old_flow(): void
    {
        $item = $this->readyItem(qty: 4);

        $this->assertSame([], $item->processList());
        $this->assertSame(4, $item->availableQty());
        $this->assertSame(0, $item->vendorWaitingQty());
        $this->pickup($item, 4)->assertSessionHasNoErrors();
    }

    public function test_work_order_page_lists_vendor_steps_and_history(): void
    {
        $item = $this->itemWithProcesses();
        $this->send($item, 'Bordir', 4, 'Bordir Pak Ujang')->assertSessionHasNoErrors();

        $this->actingAs($this->owner())
            ->get(route('work-orders.show', $item->work_order_id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('workOrder.vendor_qty', 4)
                ->where('workOrder.vendor_waiting_qty', 6)
                ->where('workOrder.items.0.vendor_steps.0', ['process' => 'Bordir', 'waiting_qty' => 6, 'at_vendor_qty' => 4, 'done_qty' => 0])
                ->where('workOrder.items.0.open_vendor_jobs.0.vendor_name', 'Bordir Pak Ujang')
                ->where('vendorJobs.0.process', 'Bordir')
                ->where('vendorNames', ['Bordir Pak Ujang']));
    }

    public function test_packing_progress_shows_which_vendor_holds_the_goods(): void
    {
        config(['services.packingv2.key' => self::KEY]);
        $item = $this->itemWithProcesses();
        $item->workOrder->update(['packing_production_order_id' => 88]);
        $item->update(['packing_production_order_item_id' => 880]);
        $this->send($item, 'Bordir', 9, 'CV Maju')->assertSessionHasNoErrors();

        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->getJson('/api/v1/packing/work-orders/88/progress')
            ->assertOk()
            ->assertJsonPath('data.stage', 'at_vendor')
            ->assertJsonPath('data.stage_label', 'Di vendor · Bordir (CV Maju)')
            ->assertJsonPath('data.totals.vendor', 9)
            ->assertJsonPath('data.totals.vendor_waiting', 1)
            ->assertJsonPath('data.vendor_locations.0', ['process' => 'Bordir', 'vendor_name' => 'CV Maju', 'qty' => 9])
            ->assertJsonPath('data.items.0.processes', ['Bordir', 'Prisket']);
    }

    public function test_admin_role_gets_the_vendor_ability(): void
    {
        $this->assertTrue($this->warehouseAdmin()->hasAbility(Ability::VendorProcessManage));
    }
}
