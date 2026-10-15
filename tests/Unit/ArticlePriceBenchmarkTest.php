<?php

namespace Tests\Unit;

use App\Services\Sewing\ArticlePriceBenchmark;
use PHPUnit\Framework\TestCase;

class ArticlePriceBenchmarkTest extends TestCase
{
    public function test_suggestion_averages_fastest_middle_and_slowest_then_rounds_to_thousands(): void
    {
        $result = (new ArticlePriceBenchmark)->build([
            $this->sample(1, 'Hitam', 'Bu A', 40),
            $this->sample(2, 'Merah', 'Bu B', 55),
            $this->sample(3, 'Hijau', 'Bu C', 90),
            $this->sample(4, 'Navy', 'Bu D', 120),
        ], 26_000);

        $this->assertTrue($result['ready']);
        $this->assertSame(4, $result['color_count']);
        $this->assertSame(['tercepat', 'sedang', 'terlambat'], array_column($result['points'], 'role'));
        $this->assertSame(['Hitam', 'Merah', 'Navy'], array_column($result['points'], 'color'));
        $this->assertSame([17_333, 23_833, 52_000], array_column($result['points'], 'price'));
        $this->assertSame(['Hijau'], array_column($result['others'], 'color'));
        $this->assertSame(31_055, $result['raw_average']);
        $this->assertSame(31_000, $result['suggested_rate']);
    }

    public function test_same_color_is_averaged_across_tailors_before_ranking(): void
    {
        $result = (new ArticlePriceBenchmark)->build([
            $this->sample(1, 'Hitam', 'Bu A', 40),
            $this->sample(2, 'hitam', 'Bu B', 50),
            $this->sample(3, 'Merah', 'Bu C', 60),
            $this->sample(4, 'Navy', 'Bu D', 120),
        ], 26_000);

        $this->assertSame(3, $result['color_count']);
        $this->assertSame('Bu A (40 menit), Bu B (50 menit)', $result['points'][0]['tailor_label']);
        $this->assertSame('45 menit', $result['points'][0]['minutes_label']);
        $this->assertSame(19_500, $result['points'][0]['price']);
        $this->assertSame(32_500, $result['raw_average']);
        $this->assertSame(33_000, $result['suggested_rate']);
    }

    public function test_fewer_than_three_colors_stays_a_preview(): void
    {
        $result = (new ArticlePriceBenchmark)->build([
            $this->sample(1, 'Hitam', 'Bu A', 40),
            $this->sample(2, 'Merah', 'Bu B', 55),
        ], 26_000);

        $this->assertFalse($result['ready']);
        $this->assertNull($result['suggested_rate']);
        $this->assertSame([], $result['points']);
    }

    /**
     * @return array{id: int, color: string, tailor_id: int, tailor_name: string, duration_seconds: int, started_at: string, finished_at: string}
     */
    private function sample(int $id, string $color, string $tailor, int $minutes): array
    {
        return [
            'id' => $id,
            'color' => $color,
            'tailor_id' => $id,
            'tailor_name' => $tailor,
            'duration_seconds' => $minutes * 60,
            'started_at' => '2026-10-01 08:00',
            'finished_at' => '2026-10-01 09:00',
        ];
    }
}
