<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\CancelPickupItemAction;
use App\Actions\Sewing\CreatePickupAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\StorePickupRequest;
use App\Models\PickupItem;
use App\Models\Tailor;
use App\Presenters\ProductionPresenter;
use App\Presenters\WorkOrderPresenter;
use App\Services\Sewing\FloorQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class PickupController extends Controller
{
    public function create(Request $request, FloorQuery $floor, ProductionPresenter $production, WorkOrderPresenter $workOrders): Response
    {
        return Inertia::render('Pickups/Create', [
            'tailors' => Tailor::query()->where('is_active', true)->orderBy('name')->get()->map(fn (Tailor $tailor) => $production->tailor($tailor)),
            'availableItems' => $floor->availableItems()->map(fn ($item) => $workOrders->item($item)),
            'presetTailorId' => $request->integer('tailor') ?: null,
        ]);
    }

    public function store(StorePickupRequest $request, CreatePickupAction $createPickup): RedirectResponse
    {
        $data = $request->validated();

        // Rates are owner-only master data; an admin's pickup always uses the article rate.
        if (! $request->user()->isSuperadmin()) {
            $data['items'] = array_map(fn (array $item) => array_diff_key($item, ['sewing_rate' => true]), $data['items']);
        }

        $pickup = $createPickup->execute($data, $request->user()->id);
        $qty = $pickup->items->sum('qty');

        if ($request->boolean('from_desk')) {
            return Redirect::route('desk.index', ['tailor' => $pickup->tailor_id])
                ->with('status', "{$pickup->tailor->name} ambil {$qty} pcs ({$pickup->items->count()} barang).");
        }

        return Redirect::route('deliveries.index')
            ->with('status', "{$pickup->tailor->name} ambil {$qty} pcs ({$pickup->items->count()} barang).");
    }

    public function cancelItem(PickupItem $pickupItem, CancelPickupItemAction $cancel): RedirectResponse
    {
        $cancel->execute($pickupItem);

        return Redirect::back()->with('status', 'Pengambilan dibatalkan, barang kembali ke gudang.');
    }
}
