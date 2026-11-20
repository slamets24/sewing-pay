<?php

namespace App\Http\Controllers\Sewing;

use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Halaman WO tanpa login untuk dibagikan ke grup WA. Tautannya ditandatangani (signed URL),
 * jadi nomor WO lain tidak bisa ditebak dari alamatnya.
 */
class PublicWorkOrderController extends Controller
{
    public function __invoke(WorkOrder $workOrder): Response
    {
        $workOrder->load(['items' => fn ($query) => WorkOrderItem::withQcShippedQty($query), 'items.article']);

        $articles = $workOrder->items
            ->groupBy('article_id')
            ->map(fn ($items) => [
                'name' => $items->first()->article->name,
                'brand_name' => $items->first()->article->brand_name,
                'qty' => (int) $items->sum('planned_qty'),
                'done_qty' => (int) $items->sum('delivered_qty'),
                'variants' => $items
                    ->sortBy([['color', 'asc'], ['size', 'asc']])
                    ->map(fn (WorkOrderItem $item) => ['color' => $item->color, 'size' => $item->size, 'qty' => $item->planned_qty])
                    ->values(),
            ])
            ->sortBy('name')
            ->values();

        return Inertia::render('WorkOrders/Public', [
            'workOrder' => [
                'number' => $workOrder->number,
                'channel' => $workOrder->channel,
                'category' => $workOrder->category,
                'ordered_at' => $workOrder->ordered_at?->toDateString(),
                'due_at' => $workOrder->due_at?->toDateString(),
                'notes' => $workOrder->notes,
                'planned_qty' => (int) $workOrder->items->sum('planned_qty'),
                'done_qty' => (int) $workOrder->items->sum('delivered_qty'),
                'articles' => $articles,
            ],
        ]);
    }
}
