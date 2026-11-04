<?php

namespace App\Services\Sewing;

use Generator;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/** Reads the article catalog from packingv2's `GET /api/v1/articles` (see docs/prompt-packingv2-api-artikel.md). */
class PackingArticleClient
{
    private const PER_PAGE = 200;

    public function isConfigured(): bool
    {
        return filled($this->baseUrl()) && filled(config('services.packingv2.key'));
    }

    /**
     * Walks every page, including soft-deleted articles so they can be deactivated locally.
     *
     * @return Generator<int, array<string, mixed>>
     */
    public function articles(): Generator
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('PACKINGV2_API_URL / PACKINGV2_API_KEY belum diisi.');
        }

        $page = 1;

        do {
            $response = Http::baseUrl($this->baseUrl())
                ->withHeaders(['X-Api-Key' => (string) config('services.packingv2.key')])
                ->acceptJson()
                ->timeout(20)
                ->retry(2, 500, throw: false)
                ->get('/api/v1/articles', [
                    'page' => $page,
                    'per_page' => self::PER_PAGE,
                    'include_deleted' => 'true',
                ]);

            if ($response->failed()) {
                throw new RuntimeException("packingv2 menolak permintaan (HTTP {$response->status()}).");
            }

            foreach ($response->json('data', []) as $article) {
                yield $article;
            }

            $lastPage = (int) $response->json('meta.last_page', $page);
            $page++;
        } while ($page <= $lastPage);
    }

    /**
     * Minta penerbitan barcode SKU resmi ke packingv2 untuk artikel dan varian.
     *
     * @param  array{article_name: string, brand_name?: string|null, category_name?: string|null, variants: list<array{color: string, size: string, item_type?: string|null}>}  $payload
     * @return array<string, mixed>
     */
    public function provisionArticle(array $payload): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('PACKINGV2_API_URL / PACKINGV2_API_KEY belum diisi.');
        }

        $response = Http::baseUrl($this->baseUrl())
            ->withHeaders(['X-Api-Key' => (string) config('services.packingv2.key')])
            ->acceptJson()
            ->timeout(20)
            ->post('/api/v1/articles/provision', $payload);

        if ($response->failed()) {
            throw new RuntimeException("packingv2 menolak penerbitan barcode (HTTP {$response->status()}).");
        }

        return $response->json('data', []);
    }

    /**
     * Mengirim koreksi nama artikel ke packingv2.
     */
    public function updateArticleName(int $packingArticleId, string $newName): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        $response = Http::baseUrl($this->baseUrl())
            ->withHeaders(['X-Api-Key' => (string) config('services.packingv2.key')])
            ->acceptJson()
            ->timeout(15)
            ->patch("/api/v1/articles/{$packingArticleId}", [
                'name' => $newName,
            ]);

        return $response->successful();
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.packingv2.url'), '/');
    }
}
