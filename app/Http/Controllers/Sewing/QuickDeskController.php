<?php

namespace App\Http\Controllers\Sewing;

use App\Http\Controllers\Controller;
use App\Models\Tailor;
use App\Presenters\ProductionPresenter;
use App\Presenters\WorkOrderPresenter;
use App\Services\Sewing\FloorQuery;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QuickDeskController extends Controller
{
    public function index(Request $request, FloorQuery $floor, ProductionPresenter $production, WorkOrderPresenter $workOrders): Response
    {
        $openItems = $floor->openPickupItems();
        $holdingSummary = $openItems->groupBy('tailor_id')->map(fn ($group) => [
            'holding_qty' => (int) $group->sum(fn ($item) => $item->remainingQty()),
            'items_count' => $group->count(),
        ]);

        $tailors = Tailor::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Tailor $tailor) use ($production, $holdingSummary) {
                $data = $production->tailor($tailor);
                $summary = $holdingSummary->get($tailor->id, ['holding_qty' => 0, 'items_count' => 0]);
                $data['holding_qty'] = $summary['holding_qty'];
                $data['items_count'] = $summary['items_count'];

                return $data;
            });

        return Inertia::render('Desk/Index', [
            'tailors' => $tailors,
            'board' => $production->board($openItems),
            'availableItems' => $floor->availableItems()->map(fn ($item) => $workOrders->item($item)),
            'presetTailorId' => $request->integer('tailor') ?: null,
            'recentDeliveries' => $floor->recentDeliveries(25)->map(fn ($delivery) => $production->delivery($delivery)),
        ]);
    }
}
