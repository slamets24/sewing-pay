<?php

namespace App\Services;

use App\Models\ProductionArticle;
use Illuminate\Support\Collection;

/**
 * Recently used article names, colours and sizes, so the hancaan form can offer
 * them as one-tap choices instead of making the admin retype them.
 */
class HancaanSuggestionService
{
    private const SAMPLE_SIZE = 300;

    private const LIMIT = 24;

    /**
     * @return array{articles: Collection<int, array{name: string, work_type_id: int}>, colors: Collection<int, string>, sizes: Collection<int, string>}
     */
    public function forForm(): array
    {
        $recent = ProductionArticle::query()
            ->latest('id')
            ->limit(self::SAMPLE_SIZE)
            ->get(['article_name', 'work_type_id', 'color', 'size']);

        return [
            'articles' => $recent
                ->unique(fn (ProductionArticle $article) => mb_strtolower($article->article_name))
                ->take(self::LIMIT)
                ->map(fn (ProductionArticle $article) => [
                    'name' => $article->article_name,
                    'work_type_id' => $article->work_type_id,
                ])
                ->values(),
            'colors' => $this->distinct($recent->pluck('color')),
            'sizes' => $this->distinct($recent->pluck('size')),
        ];
    }

    /**
     * @param  Collection<int, string|null>  $values
     * @return Collection<int, string>
     */
    private function distinct(Collection $values): Collection
    {
        return $values
            ->filter()
            ->unique(fn (string $value) => mb_strtolower($value))
            ->take(self::LIMIT)
            ->values();
    }
}
