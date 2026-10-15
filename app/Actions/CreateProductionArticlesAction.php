<?php

namespace App\Actions;

use App\Enums\ProductionArticleStatus;
use App\Models\ProductionArticle;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CreateProductionArticlesAction
{
    /**
     * Create one ready-to-pick hancaan per colour/size variant of the same article.
     *
     * @param  array{work_type_id:int,article_name:string,ready_at?:string|null,notes?:string|null,variants:list<array{color?:string|null,size?:string|null,planned_qty:int}>}  $data
     * @return Collection<int, ProductionArticle>
     */
    public function execute(array $data, ?int $createdBy = null): Collection
    {
        return DB::transaction(fn () => collect($data['variants'])
            ->map(fn (array $variant) => ProductionArticle::create([
                'work_type_id' => $data['work_type_id'],
                'created_by' => $createdBy,
                'article_name' => $data['article_name'],
                'color' => $variant['color'] ?? null,
                'size' => $variant['size'] ?? null,
                'planned_qty' => $variant['planned_qty'],
                'available_qty' => $variant['planned_qty'],
                'assigned_qty' => 0,
                'completed_qty' => 0,
                'status' => ProductionArticleStatus::Ready,
                'ready_at' => $data['ready_at'] ?? today(),
                'notes' => $data['notes'] ?? null,
            ])));
    }
}
