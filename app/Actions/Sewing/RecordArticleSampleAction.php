<?php

namespace App\Actions\Sewing;

use App\Models\Article;
use App\Models\ArticleSewingSample;
use App\Models\Tailor;
use App\Models\User;
use App\Services\Sewing\ArticlePriceBenchmark;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/** Stores one timed sample piece and refreshes the article's price benchmark. Does not change the official sewing rate. */
class RecordArticleSampleAction
{
    public function __construct(private ArticlePriceBenchmark $benchmark) {}

    /**
     * @param  array{tailor_id: int, color: string, started_at: string, finished_at: string}  $data
     */
    public function execute(Article $article, array $data, ?User $actor = null): ArticleSewingSample
    {
        $tailor = Tailor::query()->whereKey($data['tailor_id'])->where('is_active', true)->first();

        if ($tailor === null) {
            throw ValidationException::withMessages(['tailor_id' => 'Pilih penjahit yang masih aktif.']);
        }

        $started = Carbon::parse($data['started_at']);
        $finished = Carbon::parse($data['finished_at']);
        $seconds = $finished->getTimestamp() - $started->getTimestamp();

        if ($seconds < 60) {
            throw ValidationException::withMessages(['finished_at' => 'Waktu selesai minimal 1 menit setelah mulai.']);
        }

        if ($seconds > 24 * 3600) {
            throw ValidationException::withMessages(['finished_at' => 'Satu pcs dicatat paling lama 24 jam.']);
        }

        $sample = $article->sewingSamples()->create([
            'tailor_id' => $tailor->id,
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
