<?php

namespace Database\Seeders;

use App\Actions\Sewing\RecordArticleSampleAction;
use App\Enums\ArticleSource;
use App\Models\Article;
use App\Models\Tailor;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/** Local-only timed sample pieces: one article per benchmark state (ready, still collecting, new article without rate). Needs SewingDemoSeeder first. */
class ArticleBenchmarkDemoSeeder extends Seeder
{
    public function run(RecordArticleSampleAction $record): void
    {
        $owner = User::query()->where('email', 'test@example.com')->first();
        $tailors = Tailor::query()->whereIn('code', ['PNJ-001', 'PNJ-002', 'PNJ-003'])->pluck('id', 'code');

        if ($tailors->count() < 3) {
            return;
        }

        $gavita = Article::query()->firstOrCreate(['name' => 'Gavita'], [
            'source' => ArticleSource::Manual,
            'category_name' => 'Dress',
            'sewing_rate' => 0,
            'is_active' => true,
        ]);

        $plan = [
            'Marina' => [
                ['PNJ-001', 'Teal blue', 14],
                ['PNJ-002', 'Teal blue', 18],
                ['PNJ-001', 'Brown', 16],
                ['PNJ-003', 'Black', 21],
                ['PNJ-002', 'Maroon', 25],
            ],
            'Gavita' => [
                ['PNJ-001', 'Hitam', 40],
                ['PNJ-002', 'Merah', 55],
                ['PNJ-003', 'Navy', 120],
            ],
            'Cecilia' => [
                ['PNJ-003', 'Coffe', 19],
                ['PNJ-001', 'Sage', 22],
            ],
        ];

        $start = Carbon::parse(today()->subDays(3)->format('Y-m-d').' 08:00');

        foreach ($plan as $name => $pieces) {
            $article = $name === 'Gavita' ? $gavita : Article::query()->where('name', $name)->first();

            if ($article === null || $article->sewingSamples()->exists()) {
                continue;
            }

            foreach ($pieces as [$code, $color, $minutes]) {
                $record->execute($article, [
                    'tailor_id' => $tailors[$code],
                    'color' => $color,
                    'started_at' => $start->format('Y-m-d H:i:s'),
                    'finished_at' => $start->copy()->addMinutes($minutes)->format('Y-m-d H:i:s'),
                ], $owner);

                $start->addMinutes($minutes + 10);
            }
        }

        // Seed sample attendances for demo
        foreach ($tailors as $code => $tailorId) {
            \App\Models\TailorAttendance::query()->firstOrCreate(
                ['tailor_id' => $tailorId, 'date' => today()->toDateString()],
                [
                    'clock_in' => '08:00',
                    'clock_out' => '17:00',
                    'working_hours' => 9,
                    'meal_allowance' => 241_400,
                    'status' => 'present',
                    'is_self_clocked' => true,
                    'created_by' => $owner?->id,
                ]
            );
        }
    }
}
