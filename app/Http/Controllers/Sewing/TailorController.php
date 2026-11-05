<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\SyncHrTailorsAction;
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
                ->map(fn (Tailor $tailor) => $presenter->tailor($tailor)),
            'nextCode' => $this->nextCode(),
        ]);
    }

    public function syncHr(SyncHrTailorsAction $syncAction): RedirectResponse
    {
        try {
            $result = $syncAction->execute();

            return Redirect::back()->with('status', "Sinkronisasi HR selesai: {$result['synced']} penjahit diperiksa ({$result['created']} baru, {$result['updated']} diperbarui).");
        } catch (\Throwable $e) {
            return Redirect::back()->with('error', 'Gagal menyinkronkan dengan HR: '.$e->getMessage());
        }
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
