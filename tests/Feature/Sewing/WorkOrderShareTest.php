<?php

namespace Tests\Feature\Sewing;

use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Data laporan WO ke grup WA: per nama artikel, berapa di gudang dan berapa di penjahit. */
class WorkOrderShareTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    public function test_detail_has_warehouse_and_tailor_qty_per_article(): void
    {
        $marina = $this->article('Marina');
        $vella = $this->article('Vella');
        $workOrder = WorkOrder::create(['number' => 'LOKA 324', 'ordered_at' => today()]);
        $marinaM = $workOrder->items()->create(['article_id' => $marina->id, 'color' => 'Black', 'size' => 'M', 'planned_qty' => 10, 'cutting_qty' => 10, 'received_qty' => 10]);
        $workOrder->items()->create(['article_id' => $marina->id, 'color' => 'Black', 'size' => 'L', 'planned_qty' => 6, 'cutting_qty' => 6, 'received_qty' => 6]);
        $workOrder->items()->create(['article_id' => $vella->id, 'color' => 'Khaki', 'size' => 'M', 'planned_qty' => 3, 'cutting_qty' => 0, 'received_qty' => 0]);

        $this->actingAs($this->warehouseAdmin())->post(route('pickups.store'), [
            'tailor_id' => $this->tailor()->id,
            'items' => [['work_order_item_id' => $marinaM->id, 'qty' => 4]],
        ])->assertSessionHasNoErrors();

        $this->actingAs($this->warehouseAdmin())
            ->get(route('work-orders.show', $workOrder))
            ->assertInertia(fn ($page) => $page
                ->where('workOrder.article_lines.0.name', 'Marina')
                ->where('workOrder.article_lines.0.warehouse_qty', 12)
                ->where('workOrder.article_lines.0.sewing_qty', 4)
                ->where('workOrder.article_lines.1.name', 'Vella')
                ->where('workOrder.article_lines.1.warehouse_qty', 0)
                ->where('workOrder.article_lines.1.sewing_qty', 0)
                ->missing('workOrder.public_url'));
    }
}
