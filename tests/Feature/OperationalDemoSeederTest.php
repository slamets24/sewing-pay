<?php

namespace Tests\Feature;

use App\Models\ProductionArticle;
use App\Models\Tailor;
use App\Models\TailorAssignment;
use App\Models\TailorAssignmentCompletion;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\OperationalDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationalDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_operational_demo_seeder_creates_mobile_ready_data_idempotently(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(OperationalDemoSeeder::class);
        $this->seed(OperationalDemoSeeder::class);

        $this->assertSame(3, Tailor::query()->whereIn('code', ['PNJ-SITI', 'PNJ-AYU', 'PNJ-DEWI'])->count());
        $this->assertSame(3, ProductionArticle::query()->where('article_name', 'like', '%Demo')->count());
        $this->assertSame(3, TailorAssignment::query()->count());
        $this->assertSame(2, TailorAssignmentCompletion::query()->count());

        $article = ProductionArticle::query()->where('article_name', 'Kemeja Linen Demo')->firstOrFail();

        $this->assertSame(50, $article->available_qty);
        $this->assertSame(30, $article->assigned_qty);
        $this->assertSame(12, $article->completed_qty);
    }
}