<?php

namespace App\Actions\Sewing;

use App\Models\Article;
use App\Models\ArticleSewingSample;
use App\Models\Tailor;
use App\Models\TailorAttendance;
use App\Models\User;
use App\Services\Sewing\ArticlePriceBenchmark;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/** Stores one timed sample piece and refreshes the article's price benchmark. Does not change the official sewing rate. */
class RecordArticleSampleAction
{
    public function __construct(private ArticlePriceBenchmark $benchmark) {}

    /**
     * @param  array{tailor_id: int, color: string, started_at?: string|null, finished_at?: string|null, duration_minutes?: float|int|null, working_hours?: int|null}  $data
     */
    public function execute(Article $article, array $data, ?User $actor = null): ArticleSewingSample
    {
        $tailor = Tailor::query()->whereKey($data['tailor_id'])->where('is_active', true)->first();

        if ($tailor === null) {
            throw ValidationException::withMessages(['tailor_id' => 'Pilih penjahit yang masih aktif.']);
        }

        if (! empty($data['duration_minutes'])) {
            $seconds = (int) round(((float) $data['duration_minutes']) * 60);
            $finished = ! empty($data['finished_at']) ? Carbon::parse($data['finished_at']) : now();
            $started = ! empty($data['started_at']) ? Carbon::parse($data['started_at']) : (clone $finished)->subSeconds($seconds);
        } else {
            $started = Carbon::parse($data['started_at']);
            $finished = Carbon::parse($data['finished_at']);
            $seconds = $finished->getTimestamp() - $started->getTimestamp();
        }

        $errorKey = ! empty($data['duration_minutes']) ? 'duration_minutes' : 'finished_at';

        if ($seconds < 60) {
            throw ValidationException::withMessages([$errorKey => 'Waktu pengerjaan minimal 1 menit setelah mulai.']);
        }

        if ($seconds > 24 * 3600) {
            throw ValidationException::withMessages([$errorKey => 'Satu pcs dicatat paling lama 24 jam.']);
        }

        // Determine working hours & meal allowance
        $workingHours = ! empty($data['working_hours']) ? (int) $data['working_hours'] : null;

        if ($workingHours === null) {
            // Check today's attendance for this tailor
            $todayAttendance = $tailor->attendances()->whereDate('date', today())->first();
            $workingHours = $todayAttendance?->working_hours ?? (int) config('sewing.default_working_hours', 9);
        }

        $benchmarkStandard = TailorAttendance::standardBenchmarkRate($workingHours);

        $sample = $article->sewingSamples()->create([
            'tailor_id' => $tailor->id,
            'working_hours' => $workingHours,
            'meal_allowance' => $benchmarkStandard,
            'color' => preg_replace('/\s+/u', ' ', trim($data['color'])) ?? '',
            'started_at' => $started,
            'finished_at' => $finished,
            'duration_seconds' => $seconds,
            'created_by' => $actor?->id,
        ]);

        $this->benchmark->sync($article);

        return $sample;
    }
}
