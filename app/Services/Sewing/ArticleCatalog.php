<?php

namespace App\Services\Sewing;

use App\Models\Article;
use App\Models\ArticleAlias;

/** Article list and remembered WhatsApp aliases for the WO form's article picker and text parser. */
class ArticleCatalog
{
    /**
     * @return array{articles: list<array<string, mixed>>, aliases: list<array{alias: string, article_id: int}>}
     */
    public function forPicker(): array
    {
        return [
            'articles' => Article::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(fn (Article $article) => [
                    'id' => $article->id,
                    'name' => $article->name,
                    'display_name' => $article->displayName(),
                    'brand_name' => $article->brand_name,
                    'category_name' => $article->category_name,
                    'sewing_rate' => $article->sewing_rate,
                    'source' => $article->source->value,
                ])
                ->all(),
            'aliases' => ArticleAlias::query()
                ->get(['alias', 'article_id'])
                ->map(fn (ArticleAlias $alias) => ['alias' => $alias->alias, 'article_id' => $alias->article_id])
                ->all(),
        ];
    }
}
