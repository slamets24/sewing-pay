<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\DeleteArticleSampleAction;
use App\Actions\Sewing\RecordArticleSampleAction;
use App\Actions\Sewing\SaveArticleAction;
use App\Actions\Sewing\SyncPackingArticlesAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\ArticleRequest;
use App\Http\Requests\Sewing\StoreArticleSampleRequest;
use App\Models\Article;
use App\Models\ArticleSewingSample;
use App\Models\ArticleVariant;
use App\Models\Tailor;
use App\Services\Sewing\PackingArticleClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ArticleController extends Controller
{
    public function index(Request $request, PackingArticleClient $packing): Response
    {
        $articles = Article::query()
            ->with('priceSuggestion')
            ->withCount(['variants', 'variants as barcode_count' => fn ($query) => $query->whereNotNull('barcode_value')])
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get();

        $colors = ArticleVariant::query()
            ->whereNotNull('color')
            ->where('color', '!=', '')
            ->distinct()
            ->get(['article_id', 'color'])
            ->groupBy('article_id');

        return Inertia::render('Master/Articles', [
            'articles' => $articles->map(fn (Article $article) => [
                'id' => $article->id,
                'source' => $article->source->value,
                'source_label' => $article->source->label(),
                'name' => $article->name,
                'display_name' => $article->displayName(),
                'brand_name' => $article->brand_name,
                'category_name' => $article->category_name,
                'sewing_rate' => $article->sewing_rate,
                'is_active' => $article->is_active,
                'notes' => $article->notes,
                'variants_count' => $article->variants_count,
                'barcode_count' => $article->barcode_count,
                'synced_at' => $article->synced_at?->format('Y-m-d H:i'),
                'colors' => $colors->get($article->id, collect())->pluck('color')->unique()->sort()->values(),
                'benchmark' => $article->priceSuggestion?->payload,
            ]),
            'tailors' => $request->user()->isSuperadmin()
                ? Tailor::query()->where('is_active', true)->orderBy('name')->get()->map(fn (Tailor $tailor) => [
                    'id' => $tailor->id,
                    'name' => $tailor->name,
                    'code' => $tailor->code,
                    'type' => $tailor->type->value,
                ])
                : [],
            'benchmarkHourlyRate' => (int) config('sewing.benchmark_hourly_rate'),
            'packingConfigured' => $packing->isConfigured(),
            'lastSyncedAt' => Article::query()->max('synced_at'),
        ]);
    }

    public function storeSample(StoreArticleSampleRequest $request, Article $article, RecordArticleSampleAction $record): RedirectResponse
    {
        $record->execute($article, $request->validated(), $request->user());

        return Redirect::back()->with('status', "Sample {$article->name} dicatat. Tarif resmi tidak berubah.");
    }

    public function destroySample(Article $article, ArticleSewingSample $sample, DeleteArticleSampleAction $delete): RedirectResponse
    {
        abort_unless($sample->article_id === $article->id, 404);

        $delete->execute($sample);

        return Redirect::back()->with('status', 'Sample dihapus. Tarif resmi tidak berubah.');
    }

    public function store(ArticleRequest $request, SaveArticleAction $save): RedirectResponse
    {
        $data = $request->validated();

        if (! $request->user()->isSuperadmin()) {
            unset($data['sewing_rate']);
        }

        $article = $save->execute($data);

        return Redirect::back()
            ->with('status', "Artikel {$article->name} ditambahkan.")
            ->with('created_article_id', $article->id);
    }

    public function update(ArticleRequest $request, Article $article, SaveArticleAction $save): RedirectResponse
    {
        $save->execute($request->validated(), $article);

        return Redirect::back()->with('status', "Artikel {$article->name} diperbarui.");
    }

    public function sync(Request $request, SyncPackingArticlesAction $sync): RedirectResponse
    {
        try {
            $result = $sync->execute();
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['sync' => 'Gagal tarik artikel: '.$exception->getMessage()]);
        }

        return Redirect::back()->with('status', "{$result['articles']} artikel dan {$result['variants']} varian ditarik dari packingv2.");
    }
}
