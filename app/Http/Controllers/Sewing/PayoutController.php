<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\CreatePayoutAction;
use App\Actions\Sewing\GeneratePayoutAction;
use App\Actions\Sewing\ManagePayoutSlipAction;
use App\Enums\PayoutStatus;
use App\Enums\RevisionStatus;
use App\Enums\RevisionType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\UpdatePayoutSlipRequest;
use App\Models\Payout;
use App\Models\PayoutSlip;
use App\Models\Revision;
use App\Models\SewingDelivery;
use App\Presenters\PayoutPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class PayoutController extends Controller
{
    public function __construct(private readonly PayoutPresenter $presenter) {}

    public function index(): Response
    {
        $payouts = Payout::query()
            ->withCount(['slips', 'slips as paid_slips_count' => fn ($query) => $query->where('status', PayoutStatus::Paid->value)])
            ->latest('cutoff_date')
            ->latest('id')
            ->limit(50)
            ->get();

        return Inertia::render('Payouts/Index', [
            'payouts' => $payouts->map(fn (Payout $payout) => $this->presenter->summary($payout)),
            'hasDraft' => $payouts->contains(fn (Payout $payout) => $payout->isDraft()),
            'unpaid' => [
                'delivery_amount' => (int) SewingDelivery::query()->where('is_payable', true)->whereDoesntHave('slipLine')->sum('subtotal'),
                'delivery_qty' => (int) SewingDelivery::query()->where('is_payable', true)->whereDoesntHave('slipLine')->sum('qty'),
                'revision_amount' => (int) Revision::query()
                    ->where('type', RevisionType::Material->value)
                    ->where('status', RevisionStatus::Done->value)
                    ->whereDoesntHave('slipLine')
                    ->sum('subtotal'),
            ],
        ]);
    }

    public function store(Request $request, CreatePayoutAction $createPayout): RedirectResponse
    {
        $data = $request->validate([
            'cutoff_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $payout = $createPayout->execute($data['cutoff_date'], $data['notes'] ?? null, $request->user()->id);

        return Redirect::route('payouts.show', $payout)->with('status', "Draft pencairan {$payout->code} dibuat.");
    }

    public function show(Payout $payout): Response
    {
        $payout->load(['slips' => fn ($query) => $query->orderBy('invoice_number'), 'slips.tailor', 'slips.lines', 'slips.payout'])
            ->loadCount(['slips', 'slips as paid_slips_count' => fn ($query) => $query->where('status', PayoutStatus::Paid->value)]);

        return Inertia::render('Payouts/Show', [
            'payout' => $this->presenter->summary($payout),
            'slips' => $payout->slips->map(fn (PayoutSlip $slip) => $this->presenter->slip($slip)),
        ]);
    }

    public function regenerate(Payout $payout, GeneratePayoutAction $generate): RedirectResponse
    {
        $generate->execute($payout);

        return Redirect::back()->with('status', 'Draft pencairan dihitung ulang.');
    }

    public function markAllPaid(Payout $payout, ManagePayoutSlipAction $slips): RedirectResponse
    {
        $slips->markAllPaid($payout);

        return Redirect::back()->with('status', 'Semua slip ditandai dibayar.');
    }

    public function destroy(Payout $payout, ManagePayoutSlipAction $slips): RedirectResponse
    {
        $slips->deleteDraft($payout);

        return Redirect::route('payouts.index')->with('status', 'Draft pencairan dihapus.');
    }

    public function updateSlip(UpdatePayoutSlipRequest $request, PayoutSlip $slip, ManagePayoutSlipAction $slips): RedirectResponse
    {
        $slips->adjust($slip, $request->validated());

        return Redirect::back()->with('status', 'Bonus/potongan disimpan.');
    }

    public function markSlipPaid(PayoutSlip $slip, ManagePayoutSlipAction $slips): RedirectResponse
    {
        $slips->markPaid($slip);

        return Redirect::back()->with('status', 'Slip ditandai dibayar.');
    }
}
