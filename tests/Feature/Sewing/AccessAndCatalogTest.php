<?php

namespace Tests\Feature\Sewing;

use App\Enums\ArticleSource;
use App\Models\Article;
use App\Models\ArticleVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AccessAndCatalogTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    public function test_each_role_lands_on_its_own_home_and_is_kept_out_of_the_rest(): void
    {
        $admin = $this->warehouseAdmin();
        $qc = User::factory()->qc()->create();

        $this->actingAs($this->owner())->get('/')->assertRedirect(route('dashboard'));
        $this->actingAs($admin)->get('/')->assertRedirect(route('dashboard'));
        $this->actingAs($qc)->get('/')->assertRedirect(route('revisions.index'));

        $this->actingAs($admin)->get(route('work-orders.index'))->assertOk();
        $this->actingAs($admin)->get(route('payouts.index'))->assertForbidden();
        $this->actingAs($admin)->get(route('tailors.index'))->assertForbidden();

        $this->actingAs($qc)->get(route('revisions.index'))->assertOk();
        $this->actingAs($qc)->get(route('work-orders.index'))->assertForbidden();
    }

    public function test_staff_pages_render(): void
    {
        $owner = $this->owner();
        $item = $this->readyItem();

        foreach ([
            route('dashboard'),
            route('work-orders.index'),
            route('work-orders.create'),
            route('work-orders.show', $item->workOrder),
            route('pickups.create'),
            route('deliveries.index'),
            route('qc-shipments.index'),
            route('revisions.index'),
            route('payouts.index'),
            route('articles.index'),
            route('tailors.index'),
            route('revision-parts.index'),
            route('users.index'),
        ] as $url) {
            $this->actingAs($owner)->get($url)->assertOk();
        }
    }

    public function test_admin_can_add_a_manual_article_but_not_set_its_rate(): void
    {
        $this->actingAs($this->warehouseAdmin())
            ->post(route('articles.store'), ['name' => 'Gavita', 'category_name' => 'Dress', 'sewing_rate' => 9000])
            ->assertSessionHasNoErrors();

        $article = Article::query()->sole();
        $this->assertSame(ArticleSource::Manual, $article->source);
        $this->assertSame(0, $article->sewing_rate);

        $this->actingAs($this->owner())->patch(route('articles.update', $article), ['sewing_rate' => 9000])->assertSessionHasNoErrors();
        $this->assertSame(9000, $article->refresh()->sewing_rate);
    }

    public function test_sync_pulls_packingv2_articles_and_attaches_barcodes_to_existing_variants(): void
    {
        config(['services.packingv2.url' => 'https://packing.test', 'services.packingv2.key' => 'secret']);

        $existing = Article::create(['source' => ArticleSource::Packingv2, 'packing_article_id' => 12, 'name' => 'Marina', 'sewing_rate' => 7000, 'is_active' => true]);
        $existing->variants()->create(['color' => 'Teal Blue', 'size' => 'S']);

        Http::fake([
            'packing.test/api/v1/articles*' => Http::response([
                'data' => [[
                    'id' => 12,
                    'name' => 'Marina',
                    'deleted_at' => null,
                    'brand' => ['id' => 1, 'code' => 'LOKA', 'name' => 'Loka'],
                    'category' => ['id' => 3, 'name' => 'One Set'],
                    'variants' => [
                        ['master_barcode_id' => 345, 'barcode_value' => 'LOK-MTS1', 'item_type' => 'One Set', 'color' => 'teal blue', 'size' => 's', 'size_sort_order' => 2, 'is_active' => true],
                        ['master_barcode_id' => null, 'barcode_value' => null, 'item_type' => 'One Set', 'color' => 'Brown', 'size' => 'M', 'size_sort_order' => 3, 'is_active' => true],
                    ],
                ]],
                'meta' => ['last_page' => 1],
            ]),
        ]);

        $this->actingAs($this->owner())->post(route('articles.sync'))->assertSessionHasNoErrors();

        Http::assertSent(fn ($request) => $request->hasHeader('X-Api-Key', 'secret'));

        $article = $existing->refresh();
        $this->assertSame(7000, $article->sewing_rate);
        $this->assertSame('One Set', $article->category_name);
        $this->assertSame(2, ArticleVariant::query()->count());
        $this->assertSame('LOK-MTS1', $article->variants()->where('color', 'Teal Blue')->value('barcode_value'));
    }

    public function test_sync_reports_missing_configuration(): void
    {
        config(['services.packingv2.url' => null, 'services.packingv2.key' => null]);

        $this->actingAs($this->owner())->post(route('articles.sync'))->assertSessionHasErrors('sync');
    }
}
