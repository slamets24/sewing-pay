<?php

namespace App\Http\Controllers\Sewing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\TailorRequest;
use App\Models\Tailor;
use App\Presenters\ProductionPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class TailorController extends Controller
{
    public function index(ProductionPresenter $presenter): Response
    {
        return Inertia::render('Master/Tailors', [
            'tailors' => Tailor::query()
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get()
                ->map(fn (Tailor $tailor) => [
                    ...$presenter->tailor($tailor),
                    'has_portal' => filled($tailor->portal_token),
                    'portal_url' => filled($tailor->portal_token) ? route('portal.show', ['tailor' => $tailor->portal_token]) : null,
                    'portal_pin_is_default' => filled($tailor->portal_token) && $tailor->mustChangePortalPin(),
                ]),
            'nextCode' => $this->nextCode(),
        ]);
    }

    public function store(TailorRequest $request): RedirectResponse
    {
        $tailor = Tailor::create([...$request->validated(), 'is_active' => true]);

        return Redirect::back()->with('status', "Penjahit {$tailor->name} ditambahkan.");
    }

    public function update(TailorRequest $request, Tailor $tailor): RedirectResponse
    {
        $tailor->update($request->validated());

        return Redirect::back()->with('status', "Data {$tailor->name} diperbarui.");
    }

    public function openPortal(Tailor $tailor): RedirectResponse
    {
        if (filled($tailor->portal_token)) {
            return Redirect::back()->with('status', 'Portal sudah ada. Salin tautannya dari daftar penjahit.');
        }

        $tailor->generatePortal();

        return Redirect::back()->with('status', "Tautan portal {$tailor->name} dibuat. PIN awal 123456, dan wajib diganti saat pertama dibuka.");
    }

    public function resetPortalPin(Tailor $tailor): RedirectResponse
    {
        abort_unless(filled($tailor->portal_token), 404);

        $tailor->resetPortalPin();

        return Redirect::back()->with('status', "PIN {$tailor->name} dikembalikan ke 123456. Penjahit wajib membuat PIN baru.");
    }

    public function regeneratePortal(Tailor $tailor): RedirectResponse
    {
        abort_unless(filled($tailor->portal_token), 404);

        $tailor->regeneratePortalToken();

        return Redirect::back()->with('status', "Tautan portal {$tailor->name} diganti. Tautan lama tidak bisa dipakai lagi.");
    }

    private function nextCode(): string
    {
        $number = Tailor::query()->count() + 1;

        do {
            $code = 'PNJ-'.str_pad((string) $number, 3, '0', STR_PAD_LEFT);
            $number++;
        } while (Tailor::query()->where('code', $code)->exists());

        return $code;
    }
}
