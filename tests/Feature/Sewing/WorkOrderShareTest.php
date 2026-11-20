<?php

namespace Tests\Feature\Sewing;

use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOrderShareTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    private function workOrder(): WorkOrder
    {
        $marina = $this->article('Marina');
        $vella = $this->article('Vella');
        $workOrder = WorkOrder::create(['number' => 'LOKA 324', 'ordered_at' => today()]);
        $workOrder->items()->create(['article_id' => $marina->id, 'color' => 'Black', 'size' => 'M', 'planned_qty' => 10, 'cutting_qty' => 0, 'received_qty' => 0]);
        $workOrder->items()->create(['article_id' => $marina->id, 'color' => 'Black', 'size' => 'L', 'planned_qty' => 6, 'cutting_qty' => 0, 'received_qty' => 0]);
        $workOrder->items()->create(['article_id' => $vella->id, 'color' => 'Khaki', 'size' => 'M', 'planned_qty' => 3, 'cutting_qty' => 0, 'received_qty' => 0]);

        return $workOrder;
    }

    public function test_detail_has_article_totals_and_public_link_for_wa_report(): void
    {
        $workOrder = $this->workOrder();

        $this->actingAs($this->warehouseAdmin())
            ->get(route('work-orders.show', $workOrder))
            ->assertInertia(fn ($page) => $page
                ->where('workOrder.article_lines.0.name', 'Marina')
                ->where('workOrder.article_lines.0.qty', 16)
                ->where('workOrder.article_lines.1.name', 'Vella')
                ->where('workOrder.article_lines.1.qty', 3)
                ->where('workOrder.public_url', fn ($url) => str_contains($url, '/wo-publik/'.$workOrder->id) && str_contains($url, 'signature=')));
    }

    public function test_public_page_opens_without_login_only_with_valid_signature(): void
    {
        $workOrder = $this->workOrder();

        $url = $this->actingAs($this->warehouseAdmin())
            ->get(route('work-orders.show', $workOrder))
            ->viewData('page')['props']['workOrder']['public_url'];

        auth()->logout();

        $this->get($url)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('WorkOrders/Public')
                ->where('workOrder.number', 'LOKA 324')
                ->where('workOrder.planned_qty', 19)
                ->where('workOrder.articles.0.name', 'Marina')
                ->where('workOrder.articles.0.qty', 16)
                ->has('workOrder.articles.0.variants', 2));

        // Tanpa tanda tangan, atau tanda tangan untuk WO lain: ditolak.
        $this->get('/wo-publik/'.$workOrder->id)->assertForbidden();
        $other = WorkOrder::create(['number' => 'LOKA 999', 'ordered_at' => today()]);
        $this->get(str_replace('/wo-publik/'.$workOrder->id, '/wo-publik/'.$other->id, $url))->assertForbidden();
    }
}
