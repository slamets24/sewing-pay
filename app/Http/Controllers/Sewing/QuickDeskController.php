<?php

namespace App\Http\Controllers\Sewing;

use App\Http\Controllers\Controller;
use App\Models\RevisionPart;
use App\Models\SewingDelivery;
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

        $todayDeliveries = SewingDelivery::query()
            ->whereDate('delivered_at', today())
            ->with('workOrderItem')
            ->get();
        $todaySummary = $todayDeliveries->groupBy('tailor_id')->map(fn ($group) => [
            'today_delivered_qty' => (int) $group->sum('qty'),
            'today_earnings' => (int) $group->sum(fn ($d) => $d->qty * ($d->workOrderItem?->sewing_rate ?? 0)),
        ]);

        $openRevisions = $floor->openRevisions();
        $revisionsSummary = $openRevisions->groupBy('tailor_id')->map(fn ($group) => [
            'revisions_count' => (int) $group->sum('qty'),
        ]);

        $tailors = Tailor::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Tailor $tailor) use ($production, $holdingSummary, $todaySummary, $revisionsSummary) {
                $data = $production->tailor($tailor);
                $summary = $holdingSummary->get($tailor->id, ['holding_qty' => 0, 'items_count' => 0]);
                $today = $todaySummary->get($tailor->id, ['today_delivered_qty' => 0, 'today_earnings' => 0]);
                $rev = $revisionsSummary->get($tailor->id, ['revisions_count' => 0]);

                $data['holding_qty'] = $summary['holding_qty'];
                $data['items_count'] = $summary['items_count'];
                $data['today_delivered_qty'] = $today['today_delivered_qty'];
                $data['today_earnings'] = $today['today_earnings'];
                $data['revisions_count'] = $rev['revisions_count'];

                return $data;
            });

        return Inertia::render('Desk/Index', [
            'tailors' => $tailors,
            'board' => $production->board($openItems),
            'availableItems' => $floor->availableItems()->map(fn ($item) => $workOrders->item($item)),
            'presetTailorId' => $request->integer('tailor') ?: null,
            'recentDeliveries' => $floor->recentDeliveries(25)->map(fn ($delivery) => $production->delivery($delivery)),
            'openRevisions' => $openRevisions->map(fn ($r) => $production->revision($r))->values(),
            'revisionParts' => RevisionPart::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'price', 'material_type']),
        ]);
    }
}
