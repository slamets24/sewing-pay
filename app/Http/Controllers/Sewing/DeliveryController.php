<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\RecordDeliveryAction;
use App\Actions\Sewing\RecordTailorBatchDeliveryAction;
use App\Actions\Sewing\UndoDeliveryAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\StoreDeliveryRequest;
use App\Models\PickupItem;
use App\Models\SewingDelivery;
use App\Models\Tailor;
use App\Presenters\ProductionPresenter;
use App\Services\Sewing\FloorQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

    public function storeBatchForTailor(Request $request, Tailor $tailor, RecordTailorBatchDeliveryAction $batchRecord): RedirectResponse
    {
        $deliveries = $batchRecord->execute($tailor, $request->input('delivered_at'), $request->input('notes'), $request->user()->id);
        $totalQty = $deliveries->sum('qty');
        $itemsCount = $deliveries->count();

        return Redirect::back()
            ->with('status', "{$tailor->name} berhasil setor semua ({$totalQty} pcs dari {$itemsCount} barang).");
    }

    public function destroy(SewingDelivery $delivery, UndoDeliveryAction $undo): RedirectResponse
    {
        $undo->execute($delivery);

        return Redirect::back()->with('status', 'Setoran dibatalkan.');
    }
}
