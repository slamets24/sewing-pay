<?php

namespace App\Http\Controllers\Sewing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\StorePortalPinRequest;
use App\Models\PayoutSlip;
use App\Models\SewingDelivery;
use App\Models\Tailor;
use App\Presenters\PayoutPresenter;
use App\Presenters\ProductionPresenter;
use App\Services\Sewing\FloorQuery;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/** Read-only page opened from a tailor's private link, after the PIN. */
class PortalController extends Controller
{
    public function show(Tailor $tailor, FloorQuery $floor, ProductionPresenter $production, PayoutPresenter $payouts): Response
    {
        $unpaid = SewingDelivery::query()->where('tailor_id', $tailor->id)->where('is_payable', true)->whereDoesntHave('slipLine');

        return Inertia::render('Portal/Index', [
            'tailor' => $production->tailor($tailor),
            'lock_url' => route('portal.lock', ['tailor' => $tailor->portal_token]),
            'holding' => $floor->openPickupItems($tailor->id)->map(fn ($item) => $production->pickupItem($item)),
            'unpaid' => [
                'qty' => (int) (clone $unpaid)->sum('qty'),
                'amount' => (int) (clone $unpaid)->sum('subtotal'),
            ],
            'recentDeliveries' => $floor->recentDeliveries(30, $tailor->id)->map(fn ($delivery) => $production->delivery($delivery)),
            'openRevisions' => $floor->openRevisions($tailor->id)->map(fn ($revision) => $production->revision($revision)),
            'slips' => PayoutSlip::query()
                ->with(['tailor', 'payout'])
                ->where('tailor_id', $tailor->id)
                ->latest('id')
                ->limit(12)
                ->get()
                ->map(fn (PayoutSlip $slip) => [...$payouts->slip($slip, withLines: false), 'cutoff_date' => $slip->payout->cutoff_date->toDateString()]),
        ]);
    }

    public function storePin(StorePortalPinRequest $request, Tailor $tailor): RedirectResponse
    {
        if ($tailor->mustChangePortalPin()) {
            $tailor->changePortalPin($request->validated('new_pin'));
        }

        $tailor->unlockPortal();

        return redirect()->route('portal.show', ['tailor' => $tailor->portal_token]);
    }

    public function lock(Tailor $tailor): RedirectResponse
    {
        $tailor->lockPortal();

        return redirect()->route('portal.show', ['tailor' => $tailor->portal_token]);
    }
}
