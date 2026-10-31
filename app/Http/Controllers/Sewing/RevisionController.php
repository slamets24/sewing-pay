<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\AdvanceRevisionAction;
use App\Actions\Sewing\DeleteRevisionAction;
use App\Actions\Sewing\ReportRevisionAction;
use App\Enums\RevisionStatus;
use App\Enums\RevisionType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\StoreRevisionRequest;
use App\Models\Revision;
use App\Models\RevisionPart;
use App\Models\Tailor;
use App\Presenters\ProductionPresenter;
use App\Services\Sewing\FloorQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RevisionController extends Controller
{
    public function index(Request $request, FloorQuery $floor, ProductionPresenter $presenter): Response
    {
        $status = $request->query('status', 'open');
        $type = RevisionType::tryFrom((string) $request->query('type'));

        $revisions = $floor->revisions()
            ->when($status === 'open', fn ($query) => $query->where('status', '!=', RevisionStatus::Done->value))
            ->when($status === 'done', fn ($query) => $query->where('status', RevisionStatus::Done->value))
            ->when($type, fn ($query) => $query->where('type', $type->value))
            ->latest('reported_at')
            ->limit(200)
            ->get();

        return Inertia::render('Revisions/Index', [
            'filters' => ['status' => $status, 'type' => $type?->value],
            'revisions' => $revisions->map(fn (Revision $revision) => $presenter->revision($revision)),
            'sewingItems' => $floor->openPickupItems()->map(fn ($item) => $presenter->pickupItem($item)),
            'shippedDeliveries' => $floor->shippedDeliveries()->map(fn ($delivery) => $presenter->delivery($delivery)),
            'revisionParts' => RevisionPart::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'price', 'material_type']),
            'tailors' => Tailor::query()->where('is_active', true)->orderBy('name')->get()->map(fn (Tailor $tailor) => $presenter->tailor($tailor)),
        ]);
    }

    public function store(StoreRevisionRequest $request, ReportRevisionAction $report): RedirectResponse
    {
        $revision = $report->execute($request->validated(), $request->user()->id);

        return Redirect::back()->with('status', "{$revision->type->label()} {$revision->qty} pcs dicatat.");
    }

    public function advance(Request $request, Revision $revision, AdvanceRevisionAction $advance): RedirectResponse
    {
        $data = $request->validate(['tailor_id' => ['nullable', 'integer', Rule::exists('tailors', 'id')]]);
        $revision = $advance->execute($revision, $data['tailor_id'] ?? null);

        return Redirect::back()->with('status', "Revisi sekarang: {$revision->status->label()}.");
    }

    public function reassign(Request $request, Revision $revision): RedirectResponse
    {
        $data = $request->validate(['tailor_id' => ['required', 'integer', Rule::exists('tailors', 'id')]]);

        if ($revision->status === RevisionStatus::InProgress || $revision->isDone()) {
            throw ValidationException::withMessages(['tailor_id' => 'Penjahit tidak bisa diganti setelah revisi mulai dikerjakan atau selesai.']);
        }

        $tailor = Tailor::query()->findOrFail($data['tailor_id']);
        $oldTailorId = $revision->tailor_id;

        if ($oldTailorId !== $tailor->id && $revision->pickup_item_id && ! $revision->returned_to_warehouse) {
            $oldPickupItem = \App\Models\PickupItem::query()->find($revision->pickup_item_id);
            if ($oldPickupItem) {
                $oldPickupItem->qty = max(0, $oldPickupItem->qty - $revision->qty);
                if ($oldPickupItem->remainingQty() === 0) {
                    $oldPickupItem->status = $oldPickupItem->delivered_qty > 0 ? \App\Enums\PickupItemStatus::Done : \App\Enums\PickupItemStatus::Cancelled;
                }
                $oldPickupItem->save();

                $newPickup = \App\Models\Pickup::create([
                    'tailor_id' => $tailor->id,
                    'picked_at' => now(),
                    'notes' => "Pengalihan revisi #{$revision->id} dari {$oldPickupItem->tailor->name}",
                ]);

                $newPickupItem = \App\Models\PickupItem::create([
                    'pickup_id' => $newPickup->id,
                    'tailor_id' => $tailor->id,
                    'work_order_item_id' => $revision->work_order_item_id,
                    'qty' => $revision->qty,
                    'delivered_qty' => 0,
                    'sewing_rate' => $oldPickupItem->sewing_rate,
                    'status' => \App\Enums\PickupItemStatus::Open,
                ]);

                $revision->pickup_item_id = $newPickupItem->id;
            }
        }

        $rate = $revision->type->isPaid() && $tailor->isPaidHere() ? (int) ($revision->part?->price ?? $revision->rate) : 0;

        $revision->update([
            'pickup_item_id' => $revision->pickup_item_id,
            'tailor_id' => $tailor->id,
            'rate' => $rate,
            'subtotal' => $rate * $revision->qty,
        ]);

        return Redirect::back()->with('status', "Revisi dialihkan ke {$tailor->name}.");
    }

    public function destroy(Revision $revision, DeleteRevisionAction $delete): RedirectResponse
    {
        $delete->execute($revision);

        return Redirect::back()->with('status', 'Catatan revisi dihapus.');
    }
}
