<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\CreateQcShipmentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\StoreQcShipmentRequest;
use App\Models\QcShipment;
use App\Models\SewingDelivery;
use App\Presenters\ProductionPresenter;
use App\Services\Sewing\FloorQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class QcShipmentController extends Controller
{
    public function __construct(private readonly ProductionPresenter $presenter) {}

    public function index(FloorQuery $floor): Response
    {
        return Inertia::render('QcShipments/Index', [
            'unshippedDeliveries' => $floor->unshippedDeliveries()->map(fn ($delivery) => $this->presenter->delivery($delivery)),
            'shipments' => QcShipment::query()
                ->with(['deliveries', 'creator'])
                ->latest('sent_at')
                ->limit(40)
                ->get()
                ->map(fn (QcShipment $shipment) => $this->presenter->shipment($shipment)),
        ]);
    }

    public function store(StoreQcShipmentRequest $request, CreateQcShipmentAction $createShipment): RedirectResponse
    {
        $data = $request->validated();
        $shipment = $createShipment->execute($data['delivery_ids'], $data['notes'] ?? null, $request->user()->id);

        return Redirect::route('qc-shipments.labels', $shipment)
            ->with('status', "Kiriman {$shipment->number} dibuat ({$shipment->deliveries->sum('qty')} pcs). Silakan cetak labelnya.");
    }

    public function labels(QcShipment $shipment, FloorQuery $floor): Response
    {
        $deliveries = $floor->deliveries()->where('qc_shipment_id', $shipment->id)->oldest('id')->get();
        $shipment->setRelation('deliveries', $deliveries);

        return Inertia::render('QcShipments/Labels', [
            'shipment' => $this->presenter->shipment($shipment),
            'deliveries' => $deliveries->map(fn (SewingDelivery $delivery) => $this->presenter->delivery($delivery)),
        ]);
    }
}
