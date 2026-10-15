<?php

namespace App\Http\Controllers\Sewing;

use App\Http\Controllers\Controller;
use App\Models\SewingDelivery;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Presenters\ProductionPresenter;
use App\Presenters\WorkOrderPresenter;
use App\Services\Sewing\FloorQuery;
use Inertia\Inertia;
use Inertia\Response;

class OverviewController extends Controller
{
    public function __invoke(FloorQuery $floor, ProductionPresenter $production, WorkOrderPresenter $workOrders): Response
    {
        $items = WorkOrderItem::query()->get();
        $openWorkOrders = WorkOrder::query()
            ->with(['items.article'])
            ->get()
            ->reject(fn (WorkOrder $workOrder) => $workOrder->isDone());

        $openRevisions = $floor->openRevisions();

        return Inertia::render('Overview/Index', [
            'stats' => [
                'work_orders_open' => $openWorkOrders->count(),
                'work_orders_overdue' => $openWorkOrders->filter(fn (WorkOrder $workOrder) => $workOrder->isOverdue())->count(),
                'pending_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->pendingQty()),
                'available_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->availableQty()),
                'sewing_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->sewingQty()),
                'hold_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->holdQty()),
                'delivered_today_qty' => (int) SewingDelivery::query()->whereDate('delivered_at', today())->sum('qty'),
                'unshipped_qty' => (int) SewingDelivery::query()->whereNull('qc_shipment_id')->sum('qty'),
                'revisions_open' => $openRevisions->count(),
            ],
            'board' => $production->board($floor->openPickupItems()),
            'dueSoon' => $openWorkOrders
                ->filter(fn (WorkOrder $workOrder) => $workOrder->due_at !== null && $workOrder->due_at->lte(today()->addDays(3)))
                ->sortBy('due_at')
                ->take(8)
                ->values()
                ->map(fn (WorkOrder $workOrder) => $workOrders->summary($workOrder)),
            'recentDeliveries' => $floor->recentDeliveries(8)->map(fn ($delivery) => $production->delivery($delivery)),
        ]);
    }
}
