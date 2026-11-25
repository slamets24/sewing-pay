<?php

namespace App\Services\Sewing;

use Generator;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Membaca WO Produksi dari packingv2 lewat `GET /api/v1/production-orders`.
 *
 * Ini jalur cadangan: biasanya packingv2 sudah mengirim WO sendiri (PUT /api/v1/packing/work-orders/{id}),
 * tapi kalau kiriman itu gagal, admin bisa menarik WO dari halaman WO.
 */
class PackingWorkOrderClient
{
    private const PER_PAGE = 50;

    private const MAX_PAGES = 20;

    public function isConfigured(): bool
    {
        return filled($this->baseUrl()) && filled(config('services.packingv2.key'));
    }

    /**
     * WO Produksi yang dibuat dalam beberapa hari terakhir dan belum selesai di packing.
     * Tiap baris berisi `packing_production_order_id` plus isi yang sama dengan kiriman otomatis packingv2.
     *
     * @return Generator<int, array<string, mixed>>
     */
    public function recent(int $days): Generator
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('PACKINGV2_API_URL / PACKINGV2_API_KEY belum diisi.');
        }

        $page = 1;

        do {
            $response = Http::baseUrl($this->baseUrl())
                ->withHeaders(['X-Api-Key' => (string) config('services.packingv2.key')])
                ->acceptJson()
                ->connectTimeout(5)
                ->timeout(20)
                ->retry(2, 500, throw: false)
                ->get('/api/v1/production-orders', [
                    'days' => $days,
                    'page' => $page,
                    'per_page' => self::PER_PAGE,
                ]);

            if ($response->status() === 404) {
                throw new RuntimeException('packingv2 belum punya endpoint daftar WO (GET /api/v1/production-orders).');
            }

            if ($response->failed()) {
                throw new RuntimeException("packingv2 menolak permintaan (HTTP {$response->status()}).");
            }

            foreach ((array) $response->json('data', []) as $order) {
                if (is_array($order)) {
                    yield $order;
                }
            }

            $lastPage = (int) $response->json('meta.last_page', $page);
            $page++;
        } while ($page <= $lastPage && $page <= self::MAX_PAGES);
    }

    /**
     * Tes koneksi: alamat packingv2 bisa dihubungi dan kunci API diterima.
     */
    public function ping(): ConnectionCheckResult
    {
        if (! $this->isConfigured()) {
            return ConnectionCheckResult::notConfigured('PACKINGV2_API_URL / PACKINGV2_API_KEY');
        }

        return ConnectionCheckResult::from('Packing', fn () => Http::baseUrl($this->baseUrl())
            ->withHeaders(['X-Api-Key' => (string) config('services.packingv2.key')])
            ->acceptJson()
            ->connectTimeout(5)
            ->timeout(8)
            ->get('/api/v1/ping'));
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.packingv2.url'), '/');
    }
}
