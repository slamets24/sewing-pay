<?php

namespace App\Actions\Sewing;

use App\Models\ArticleSewingSample;
use App\Services\Sewing\ArticlePriceBenchmark;

/** Removes one sample and refreshes the benchmark. The official sewing rate is left as it is. */
class DeleteArticleSampleAction
{
    public function __construct(private ArticlePriceBenchmark $benchmark) {}

    public function execute(ArticleSewingSample $sample): void
    {
        $article = $sample->article;
        $sample->delete();
        $this->benchmark->sync($article);
    }
}
