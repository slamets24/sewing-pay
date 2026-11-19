<?php

namespace Tests\Feature\Sewing;

use App\Enums\ArticleSource;
use App\Enums\TailorType;
use App\Models\Article;
use App\Models\Payout;
use App\Models\PickupItem;
use App\Models\SewingDelivery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Changing an article rate must reach work that is not paid yet (packingv2 articles arrive at Rp0). */
class ArticleRateUpdateTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    private function packingArticle(int $rate = 0): Article
    {
        return Article::create(['source' => ArticleSource::Packingv2, 'packing_article_id' => 77, 'name' => 'Marina', 'category_name' => 'One Set', 'sewing_rate' => $rate, 'is_active' => true]);
    }

    private function takeAndDeliver(Article $article, TailorType $type, int $take, int $deliver): PickupItem
    {
        $item = $this->readyItem(qty: $take, article: $article);
        $tailor = $this->tailor(type: $type, name: $type === TailorType::Makloon ? 'Maklun' : 'Bu Siti');
        $this->post(route('pickups.store'), ['tailor_id' => $tailor->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => $take]]])->assertSessionHasNoErrors();
        $pickupItem = PickupItem::query()->latest('id')->first();
        if ($deliver > 0) {
            $this->post(route('deliveries.store', $pickupItem), ['qty' => $deliver])->assertSessionHasNoErrors();
        }

        return $pickupItem->refresh();
    }

    public function test_rate_filled_in_later_reaches_unpaid_work_and_the_pay_run(): void
    {
        $this->actingAs($this->owner());
        $article = $this->packingArticle(rate: 0);
        $pickupItem = $this->takeAndDeliver($article, TailorType::Internal, take: 5, deliver: 2);
        $this->assertSame(0, SewingDelivery::query()->sole()->subtotal);

        $this->patch(route('articles.update', $article), ['sewing_rate' => 9000])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('status', fn ($status) => str_contains($status, '5 pcs'));

        $this->assertSame(18000, SewingDelivery::query()->sole()->subtotal);
        $this->assertSame(9000, $pickupItem->refresh()->sewing_rate);

        $this->post(route('deliveries.store', $pickupItem), ['qty' => 3]);
        $this->post(route('payouts.store'), ['cutoff_date' => today()->toDateString()]);
        $this->assertSame(45000, Payout::query()->sole()->slips()->sole()->gross_amount);
    }

    public function test_draft_slip_follows_new_rate_but_paid_slip_and_custom_rate_do_not(): void
    {
        $this->actingAs($this->owner());
        $article = $this->packingArticle(rate: 7000);
        $this->takeAndDeliver($article, TailorType::Internal, take: 2, deliver: 2);
        $this->post(route('payouts.store'), ['cutoff_date' => today()->toDateString()]);
        $payout = Payout::query()->sole();
        $this->assertSame(14000, $payout->slips()->sole()->gross_amount);

        $this->patch(route('articles.update', $article), ['sewing_rate' => 8000])->assertSessionHasNoErrors();
        $slip = $payout->slips()->sole();
        $this->assertSame(16000, $slip->gross_amount);
        $this->assertSame(16000, $slip->net_amount);
        $this->assertSame(16000, $payout->refresh()->total_amount);
        $this->assertSame(8000, $slip->lines()->sole()->rate);

        $this->post(route('payouts.paid', $payout));
        $this->patch(route('articles.update', $article), ['sewing_rate' => 10000])->assertSessionHasNoErrors();
        $this->assertSame(16000, $slip->refresh()->gross_amount);
        $this->assertSame(16000, SewingDelivery::query()->sole()->subtotal);

        // A rate the owner typed at pickup stays as it is.
        $item = $this->readyItem(qty: 1, article: $article);
        $tailor = $this->tailor(name: 'Bu Ani');
        $this->post(route('pickups.store'), ['tailor_id' => $tailor->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 1, 'sewing_rate' => 12000]]]);
        $this->patch(route('articles.update', $article), ['sewing_rate' => 11000]);
        $this->assertSame(12000, PickupItem::query()->latest('id')->first()->sewing_rate);
    }

    public function test_makloon_rate_zero_means_same_as_internal_and_paid_makloon_work_is_kept(): void
    {
        $this->actingAs($this->owner());
        $article = $this->packingArticle(rate: 0);
        $this->takeAndDeliver($article, TailorType::Makloon, take: 4, deliver: 4);

        $this->patch(route('articles.update', $article), ['sewing_rate' => 6000, 'makloon_sewing_rate' => 0])->assertSessionHasNoErrors();
        $this->assertNull($article->refresh()->makloon_sewing_rate);
        $this->assertSame(6000, $article->makloonRate());
        $delivery = SewingDelivery::query()->sole();
        $this->assertSame(24000, $delivery->subtotal);

        $makloon = $delivery->tailor;
        $this->post(route('makloon-payments.store'), ['tailor_id' => $makloon->id, 'delivery_ids' => [$delivery->id]])->assertSessionHasNoErrors();
        $this->patch(route('articles.update', $article), ['makloon_sewing_rate' => 7000]);
        $this->assertSame(24000, $delivery->refresh()->subtotal);
    }

    public function test_command_fixes_old_work_stuck_at_zero(): void
    {
        $this->actingAs($this->owner());
        $article = $this->packingArticle(rate: 0);
        $this->takeAndDeliver($article, TailorType::Internal, take: 3, deliver: 3);
        $article->update(['sewing_rate' => 5000]); // rate set before this fix existed: work stayed at Rp0

        $this->artisan('sewing:apply-article-rates')->assertSuccessful();

        $this->assertSame(15000, SewingDelivery::query()->sole()->subtotal);
    }

    public function test_article_name_is_shown_without_the_category(): void
    {
        $article = $this->packingArticle();
        $this->assertSame('Marina', $article->displayName());

        $this->actingAs($this->owner())->get(route('articles.index'))
            ->assertInertia(fn ($page) => $page->where('articles.0.display_name', 'Marina')->where('articles.0.category_name', 'One Set'));
    }
}
