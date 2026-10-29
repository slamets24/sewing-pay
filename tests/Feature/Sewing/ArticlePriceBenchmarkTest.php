<?php

namespace Tests\Feature\Sewing;

use App\Models\Article;
use App\Models\ArticlePriceSuggestion;
use App\Models\ArticleSewingSample;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ArticlePriceBenchmarkTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    public function test_owner_records_samples_and_the_official_rate_stays_until_adopted(): void
    {
        $owner = $this->owner();
        $article = $this->article('Gavita', 0);
        $siti = $this->tailor(name: 'Bu Siti');
        $rini = $this->tailor(name: 'Bu Rini');
        $wati = $this->tailor(name: 'Bu Wati');

        $this->record($owner, $article, $siti->id, 'Hitam', 40);
        $this->record($owner, $article, $rini->id, 'Merah', 55);
        $this->assertSame(0, $article->refresh()->sewing_rate);
        $this->assertNull(ArticlePriceSuggestion::query()->where('article_id', $article->id)->value('suggested_rate'));

        $this->record($owner, $article, $wati->id, 'Navy', 120);

        $suggestion = ArticlePriceSuggestion::query()->where('article_id', $article->id)->first();
        $this->assertSame(26_000, $suggestion->hourly_rate);
        $this->assertSame(32_000, $suggestion->suggested_rate);
        $this->assertSame(0, $article->refresh()->sewing_rate);

        $this->actingAs($owner)
            ->patch(route('articles.update', $article), ['sewing_rate' => $suggestion->suggested_rate])
            ->assertSessionHasNoErrors();
        $this->assertSame(32_000, $article->refresh()->sewing_rate);

        $this->actingAs($owner)
            ->delete(route('articles.samples.destroy', [$article, ArticleSewingSample::query()->where('color', 'Navy')->first()]))
            ->assertRedirect();

        $this->assertNull(ArticlePriceSuggestion::query()->where('article_id', $article->id)->value('suggested_rate'));
        $this->assertSame(32_000, $article->refresh()->sewing_rate);

        $this->actingAs($this->warehouseAdmin())
            ->post(route('articles.samples.store', $article), [
                'tailor_id' => $siti->id,
                'color' => 'Hijau',
                'started_at' => '2026-10-01 08:00:00',
                'finished_at' => '2026-10-01 09:00:00',
            ])
            ->assertForbidden();
    }

    public function test_article_page_shows_the_saved_benchmark(): void
    {
        $owner = $this->owner();
        $article = $this->article('Gavita', 0);
        $tailor = $this->tailor();

        foreach (['Hitam' => 40, 'Merah' => 55, 'Navy' => 120] as $color => $minutes) {
            $this->record($owner, $article, $tailor->id, $color, $minutes);
        }

        $this->actingAs($owner)
            ->get(route('articles.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('articles.0.benchmark.suggested_rate', 32_000)
                ->where('articles.0.benchmark.points.1.color', 'Merah')
                ->where('articles.0.sewing_rate', 0)
                ->where('benchmarkHourlyRate', 26_000));
    }

    public function test_sample_shorter_than_a_minute_is_rejected(): void
    {
        $article = $this->article('Gavita', 0);

        $this->actingAs($this->owner())
            ->post(route('articles.samples.store', $article), [
                'tailor_id' => $this->tailor()->id,
                'color' => 'Hitam',
                'started_at' => '2026-10-01 08:00:00',
                'finished_at' => '2026-10-01 08:00:30',
            ])
            ->assertSessionHasErrors('finished_at');

        $this->assertSame(0, ArticleSewingSample::query()->count());
    }

    public function test_sample_can_be_recorded_with_quick_duration_minutes_and_shift(): void
    {
        $owner = $this->owner();
        $article = $this->article('Seruni', 0);
        $tailor = $this->tailor(name: 'Pak Darto');

        $this->actingAs($owner)
            ->post(route('articles.samples.store', $article), [
                'tailor_id' => $tailor->id,
                'color' => 'Navy',
                'working_hours' => 10,
                'duration_minutes' => 60,
            ])
            ->assertSessionHasNoErrors();

        $sample = ArticleSewingSample::query()->where('article_id', $article->id)->first();
        $this->assertNotNull($sample);
        $this->assertSame(10, $sample->working_hours);
        $this->assertSame(265_000, $sample->meal_allowance);
        $this->assertSame(3600, $sample->duration_seconds);
    }

    private function record(User $owner, Article $article, int $tailorId, string $color, int $minutes): void
    {
        $this->actingAs($owner)->post(route('articles.samples.store', $article), [
            'tailor_id' => $tailorId,
            'color' => $color,
            'started_at' => '2026-10-01 08:00:00',
            'finished_at' => Carbon::parse('2026-10-01 08:00:00')->addMinutes($minutes)->format('Y-m-d H:i:s'),
        ])->assertSessionHasNoErrors();
    }
}
