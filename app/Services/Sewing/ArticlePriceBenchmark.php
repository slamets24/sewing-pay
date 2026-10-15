<?php

namespace App\Services\Sewing;

use App\Models\Article;
use App\Models\ArticlePriceSuggestion;
use App\Models\ArticleSewingSample;

/**
 * Turns sample sewing times into an accountable rate suggestion.
 *
 * Colors are averaged across tailors first. With at least three colors, the
 * suggestion is the mean of the fastest, the one nearest the middle, and the
 * slowest, priced at the hourly rate, then rounded to the nearest thousand.
 */
class ArticlePriceBenchmark
{
    public const NEEDED_COLORS = 3;

    /**
     * @param  list<array{id: int, color: string, tailor_name: string, duration_seconds: int, started_at: string, finished_at: string, tailor_id: int}>  $samples
     * @return array<string, mixed>
     */
    public function build(array $samples, int $hourlyRate): array
    {
        $colors = $this->colors($samples, $hourlyRate);
        $ready = count($colors) >= self::NEEDED_COLORS;
        $picked = $ready ? $this->pick($colors) : ['points' => [], 'others' => $colors];
        $prices = array_column($picked['points'], 'price');
        $raw = $prices === [] ? null : (int) round(array_sum($prices) / count($prices));

        return [
            'hourly_rate' => $hourlyRate,
            'ready' => $ready,
            'color_count' => count($colors),
            'needed' => self::NEEDED_COLORS,
            'raw_average' => $raw,
            'suggested_rate' => $raw === null ? null : (int) (round($raw / 1000) * 1000),
            'points' => $picked['points'],
            'others' => $picked['others'],
            'samples' => array_map(fn (array $sample) => [
                'id' => $sample['id'],
                'color' => $sample['color'],
                'tailor_id' => $sample['tailor_id'],
                'tailor_name' => $sample['tailor_name'],
                'started_at' => $sample['started_at'],
                'finished_at' => $sample['finished_at'],
                'minutes_label' => $this->minutesLabel($sample['duration_seconds']),
                'price' => $this->price($sample['duration_seconds'], $hourlyRate),
            ], $samples),
        ];
    }

    public function sync(Article $article): void
    {
        $samples = $article->sewingSamples()->with('tailor')->orderBy('started_at')->orderBy('id')->get();

        if ($samples->isEmpty()) {
            ArticlePriceSuggestion::query()->where('article_id', $article->id)->delete();

            return;
        }

        $payload = $this->build($samples->map(fn (ArticleSewingSample $sample) => [
            'id' => $sample->id,
            'color' => $sample->color,
            'tailor_id' => $sample->tailor_id,
            'tailor_name' => $sample->tailor->name,
            'duration_seconds' => $sample->duration_seconds,
            'started_at' => $sample->started_at->format('Y-m-d H:i'),
            'finished_at' => $sample->finished_at->format('Y-m-d H:i'),
        ])->all(), (int) config('sewing.benchmark_hourly_rate'));

        $payload['calculated_at'] = now()->format('Y-m-d H:i');

        ArticlePriceSuggestion::query()->updateOrCreate(
            ['article_id' => $article->id],
            [
                'hourly_rate' => $payload['hourly_rate'],
                'suggested_rate' => $payload['suggested_rate'],
                'payload' => $payload,
                'calculated_at' => now(),
            ],
        );
    }

    /**
     * @param  list<array{id: int, color: string, tailor_name: string, duration_seconds: int}>  $samples
     * @return list<array{color: string, seconds: float, price: int, tailor_label: string, minutes_label: string}>
     */
    private function colors(array $samples, int $hourlyRate): array
    {
        $groups = [];

        foreach ($samples as $sample) {
            $key = mb_strtolower(preg_replace('/\s+/u', ' ', trim($sample['color'])) ?? '');
            $groups[$key] ??= ['color' => trim($sample['color']), 'pieces' => []];
            $groups[$key]['pieces'][] = $sample;
        }

        $colors = [];

        foreach ($groups as $group) {
            $seconds = array_sum(array_column($group['pieces'], 'duration_seconds')) / count($group['pieces']);
            $colors[] = [
                'color' => $group['color'],
                'seconds' => $seconds,
                'price' => $this->price($seconds, $hourlyRate),
                'minutes_label' => $this->minutesLabel($seconds),
                'tailor_label' => $this->tailorLabel($group['pieces']),
            ];
        }

        usort($colors, fn (array $a, array $b) => $a['seconds'] <=> $b['seconds'] ?: strcasecmp($a['color'], $b['color']));

        return $colors;
    }

    /**
     * @param  list<array{color: string, seconds: float, price: int, tailor_label: string, minutes_label: string}>  $colors
     * @return array{points: list<array<string, mixed>>, others: list<array<string, mixed>>}
     */
    private function pick(array $colors): array
    {
        $last = count($colors) - 1;
        $middle = $this->middleIndex($colors);
        $roles = [0 => 'tercepat', $middle => 'sedang', $last => 'terlambat'];
        $points = [];
        $others = [];

        foreach ($colors as $index => $color) {
            $row = [
                'color' => $color['color'],
                'minutes_label' => $color['minutes_label'],
                'price' => $color['price'],
                'tailor_label' => $color['tailor_label'],
            ];

            if (isset($roles[$index])) {
                $points[] = $row + ['role' => $roles[$index]];
            } else {
                $others[] = $row;
            }
        }

        usort($points, fn (array $a, array $b) => array_search($a['role'], ['tercepat', 'sedang', 'terlambat'], true) <=> array_search($b['role'], ['tercepat', 'sedang', 'terlambat'], true));

        return ['points' => $points, 'others' => $others];
    }

    /**
     * @param  list<array{seconds: float}>  $colors
     */
    private function middleIndex(array $colors): int
    {
        $count = count($colors);
        $last = $count - 1;
        $lower = intdiv($count, 2) - 1;
        $upper = intdiv($count, 2);
        $target = $count % 2 === 1 ? $colors[$upper]['seconds'] : ($colors[$lower]['seconds'] + $colors[$upper]['seconds']) / 2;
        $center = $last / 2;
        $best = 1;

        for ($index = 1; $index < $last; $index++) {
            $distance = abs($colors[$index]['seconds'] - $target);
            $bestDistance = abs($colors[$best]['seconds'] - $target);
            $closer = $distance + 0.001 < $bestDistance;
            $tied = abs($distance - $bestDistance) < 0.001 && abs($index - $center) < abs($best - $center);

            if ($closer || $tied) {
                $best = $index;
            }
        }

        return $best;
    }

    /**
     * @param  list<array{tailor_name: string, duration_seconds: int}>  $pieces
     */
    private function tailorLabel(array $pieces): string
    {
        if (count($pieces) === 1) {
            return $pieces[0]['tailor_name'];
        }

        return implode(', ', array_map(
            fn (array $piece) => $piece['tailor_name'].' ('.$this->minutesLabel($piece['duration_seconds']).')',
            $pieces,
        ));
    }

    private function price(int|float $seconds, int $hourlyRate): int
    {
        return (int) round($seconds / 3600 * $hourlyRate);
    }

    private function minutesLabel(int|float $seconds): string
    {
        $rounded = round($seconds / 60, 1);

        if (abs($rounded - round($rounded)) < 0.001) {
            return ((int) round($rounded)).' menit';
        }

        return number_format($rounded, 1, ',', '.').' menit';
    }
}
