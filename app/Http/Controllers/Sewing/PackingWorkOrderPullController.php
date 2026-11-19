<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\PullPackingWorkOrdersAction;
use App\Http\Controllers\Controller;
use App\Services\Sewing\PackingWorkOrderClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Throwable;

/** Tombol "Tarik dari Packing" di Daftar WO: cadangan kalau kiriman otomatis packingv2 gagal. */
class PackingWorkOrderPullController extends Controller
{
    public function __invoke(Request $request, PackingWorkOrderClient $client, PullPackingWorkOrdersAction $pull): RedirectResponse
    {
        if (! $client->isConfigured()) {
            return Redirect::back()->with('error', 'Integrasi packingv2 belum diatur (PACKINGV2_API_URL / PACKINGV2_API_KEY).');
        }

        $days = (int) ($request->validate(['days' => ['nullable', 'integer', 'min:1', 'max:365']])['days'] ?? 30);

        try {
            $result = $pull->execute($days);
        } catch (Throwable $exception) {
            report($exception);

            return Redirect::back()->with('error', 'Gagal menarik WO dari packing: '.$exception->getMessage());
        }

        return Redirect::back()->with('status', $this->message($result));
    }

    /**
     * @param  array{created: list<string>, existing: int, skipped: list<string>}  $result
     */
    private function message(array $result): string
    {
        $created = count($result['created']);
        $parts = [];

        $parts[] = $created > 0
            ? "{$created} WO baru masuk (".implode(', ', array_slice($result['created'], 0, 5)).($created > 5 ? ', …' : '').')'
            : 'Tidak ada WO baru';

        if ($result['existing'] > 0) {
            $parts[] = "{$result['existing']} sudah ada";
        }

        if ($result['skipped'] !== []) {
            $parts[] = count($result['skipped']).' dilewati (data tidak lengkap)';
        }

        return implode(' · ', $parts).'.';
    }
}
