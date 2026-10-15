<?php

namespace App\Actions\Sewing;

use App\Enums\ArticleSource;
use App\Models\Article;
use Illuminate\Validation\ValidationException;

/** Creates a manual article or edits one; names of packingv2 articles stay owned by packingv2. */
class SaveArticleAction
{
    /**
     * @param  array{name?: string, brand_name?: ?string, category_name?: ?string, sewing_rate?: ?int, is_active?: bool, notes?: ?string}  $data
     */
    public function execute(array $data, ?Article $article = null): Article
    {
        if ($article === null) {
            return Article::create([
                'source' => ArticleSource::Manual,
                'name' => trim($data['name']),
                'brand_name' => $data['brand_name'] ?? null,
                'category_name' => $data['category_name'] ?? null,
                'sewing_rate' => (int) ($data['sewing_rate'] ?? 0),
                'is_active' => true,
                'notes' => $data['notes'] ?? null,
            ]);
        }

        $changes = collect($data)->only(['sewing_rate', 'is_active', 'notes'])->all();

        if ($article->source === ArticleSource::Manual) {
            $changes += collect($data)->only(['name', 'brand_name', 'category_name'])->all();
        } elseif (isset($data['name']) && $data['name'] !== $article->name) {
            throw ValidationException::withMessages([
                'name' => 'Nama artikel dari packingv2 diubah di packingv2.',
            ]);
        }

        $article->fill($changes)->save();

        return $article;
    }
}
