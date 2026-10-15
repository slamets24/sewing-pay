<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\RecordDeliveryAction;
use App\Actions\Sewing\UndoDeliveryAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\StoreDeliveryRequest;
use App\Models\PickupItem;
use App\Models\SewingDelivery;
use App\Presenters\ProductionPresenter;
use App\Services\Sewing\FloorQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class DeliveryController extends Controller
{
    public function index(FloorQuery $floor, ProductionPresenter $production): Response
    {
        return Inertia::render('Deliveries/Index', [
            'board' => $production->board($floor->openPickupItems()),
            'recentDeliveries' => $floor->recentDeliveries(40)->map(fn ($delivery) => $production->delivery($delivery)),
        ]);
    }

    public function store(StoreDeliveryRequest $request, PickupItem $pickupItem, RecordDeliveryAction $record): RedirectResponse
    {
        $data = $request->validated();
        $delivery = $record->execute($pickupItem, (int) $data['qty'], $data['delivered_at'] ?? null, $data['notes'] ?? null, $request->user()->id);
        $delivery->load(['tailor', 'workOrderItem.article']);

        return Redirect::back()
            ->with('status', "{$delivery->tailor->name} setor {$delivery->qty} pcs {$delivery->workOrderItem->article->name}.")
            ->with('undo', ['url' => route('deliveries.destroy', $delivery), 'method' => 'delete']);
    }

    public function destroy(SewingDelivery $delivery, UndoDeliveryAction $undo): RedirectResponse
    {
        $undo->execute($delivery);

        return Redirect::back()->with('status', 'Setoran dibatalkan.');
    }
}
