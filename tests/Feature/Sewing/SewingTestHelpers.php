<?php

namespace Tests\Feature\Sewing;

use App\Enums\ArticleSource;
use App\Enums\TailorType;
use App\Models\Article;
use App\Models\Tailor;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;

trait SewingTestHelpers
{
    protected function owner(): User
    {
        return User::factory()->superadmin()->create();
    }

    protected function warehouseAdmin(): User
    {
        return User::factory()->admin()->create();
    }

    protected function article(string $name = 'Marina', int $rate = 7000): Article
    {
        return Article::create([
            'source' => ArticleSource::Manual,
            'name' => $name,
            'category_name' => 'One Set',
            'sewing_rate' => $rate,
            'is_active' => true,
        ]);
    }

    protected function tailor(TailorType $type = TailorType::Internal, string $name = 'Bu Siti'): Tailor
    {
        return Tailor::create([
            'code' => 'PNJ-'.fake()->unique()->numberBetween(100, 999),
            'name' => $name,
            'type' => $type,
            'whatsapp_number' => '081234567890',
            'is_active' => true,
        ]);
    }

    /**
     * A work order whose single line is already fully in the warehouse.
     */
    protected function readyItem(int $qty = 10, ?Article $article = null): WorkOrderItem
    {
        $article ??= $this->article();

        $workOrder = WorkOrder::create(['number' => 'WO-'.fake()->unique()->numberBetween(1000, 9999), 'ordered_at' => today()]);

        return $workOrder->items()->create([
            'article_id' => $article->id,
            'color' => 'Black',
            'size' => 'M',
            'planned_qty' => $qty,
            'received_qty' => $qty,
        ]);
    }
}
