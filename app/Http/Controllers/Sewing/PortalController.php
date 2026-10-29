<?php

namespace App\Http\Controllers\Sewing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\StorePortalPinRequest;
use App\Models\PayoutSlip;
use App\Models\SewingDelivery;
use App\Models\Tailor;
use App\Models\TailorAttendance;
use App\Presenters\PayoutPresenter;
use App\Presenters\ProductionPresenter;
use App\Services\Sewing\FloorQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Read-only page and attendance clock opened from a tailor's private link, after the PIN. */
class PortalController extends Controller
{
    public function show(Tailor $tailor, FloorQuery $floor, ProductionPresenter $production, PayoutPresenter $payouts): Response
    {
        $unpaid = SewingDelivery::query()->where('tailor_id', $tailor->id)->where('is_payable', true)->whereDoesntHave('slipLine');

        $todayAttendance = $tailor->attendances()->whereDate('date', today())->first();
        $recentAttendances = $tailor->attendances()
            ->orderByDesc('date')
            ->limit(7)
            ->get()
            ->map(fn (TailorAttendance $att) => [
                'id' => $att->id,
                'date' => $att->date->toDateString(),
                'date_label' => $att->date->translatedFormat('d M Y'),
                'clock_in' => $att->clock_in ? substr($att->clock_in, 0, 5) : null,
                'clock_out' => $att->clock_out ? substr($att->clock_out, 0, 5) : null,
                'working_hours' => $att->working_hours,
                'meal_allowance' => $att->meal_allowance,
                'status' => $att->status,
            ]);

        return Inertia::render('Portal/Index', [
            'tailor' => $production->tailor($tailor),
            'lock_url' => route('portal.lock', ['tailor' => $tailor->portal_token]),
            'clock_url' => route('portal.clock.store', ['tailor' => $tailor->portal_token]),
            'todayAttendance' => $todayAttendance ? [
                'id' => $todayAttendance->id,
                'date' => $todayAttendance->date->toDateString(),
                'clock_in' => $todayAttendance->clock_in ? substr($todayAttendance->clock_in, 0, 5) : null,
                'clock_out' => $todayAttendance->clock_out ? substr($todayAttendance->clock_out, 0, 5) : null,
                'working_hours' => $todayAttendance->working_hours,
                'meal_allowance' => $todayAttendance->meal_allowance,
                'status' => $todayAttendance->status,
                'is_self_clocked' => $todayAttendance->is_self_clocked,
            ] : null,
            'recentAttendances' => $recentAttendances,
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

    public function clock(Request $request, Tailor $tailor): RedirectResponse
    {
        $today = today()->toDateString();
        $nowTime = now()->format('H:i');

        $attendance = $tailor->attendances()->whereDate('date', $today)->first();

        if ($attendance === null) {
            $defaultHours = (int) config('sewing.default_working_hours', 9);
            $tailor->attendances()->create([
                'date' => $today,
                'clock_in' => $nowTime,
                'working_hours' => $defaultHours,
                'meal_allowance' => TailorAttendance::calculateMealAllowance($defaultHours),
                'status' => 'present',
                'is_self_clocked' => true,
            ]);

            return back()->with('status', "Absen masuk berhasil (jam {$nowTime}). Semangat bekerja!");
        }

        if (empty($attendance->clock_out)) {
            $hours = TailorAttendance::determineWorkingHours($attendance->clock_in, $nowTime);
            $allowance = TailorAttendance::calculateMealAllowance($hours);

            $attendance->update([
                'clock_out' => $nowTime,
                'working_hours' => $hours,
                'meal_allowance' => $allowance,
            ]);

            return back()->with('status', "Absen pulang berhasil (jam {$nowTime}). Total kerja {$hours} jam.");
        }

        return back()->with('status', 'Anda sudah absen masuk dan pulang untuk hari ini.');
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
