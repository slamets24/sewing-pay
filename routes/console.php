<?php

use App\Actions\Sewing\ApplyArticleRateAction;
use App\Actions\Sewing\PullPackingWorkOrdersAction;
use App\Models\Article;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('sewing:apply-article-rates', function (ApplyArticleRateAction $applyRate) {
    $total = 0;

    Article::query()->where('sewing_rate', '>', 0)->each(function (Article $article) use ($applyRate, &$total) {
        $pieces = $applyRate->execute($article, (int) $article->sewing_rate, $article->makloonRate());
        if ($pieces > 0) {
            $this->line("{$article->name}: {$pieces} pcs");
        }
        $total += $pieces;
    });

    $this->info("Selesai. {$total} pcs pekerjaan belum dibayar yang masih Rp0 sekarang ikut tarif artikelnya.");
})->purpose('Isi tarif untuk ambilan/setoran belum dibayar yang masih Rp0 (mis. artikel packingv2 yang dulu belum bertarif)');

Artisan::command('sewing:pull-packing-work-orders {--days=30 : Ambil WO packing yang dibuat dalam N hari terakhir}', function (PullPackingWorkOrdersAction $pull) {
    $result = $pull->execute(max(1, min(365, (int) $this->option('days'))));

    foreach ($result['created'] as $number) {
        $this->line("Baru: {$number}");
    }

    $this->info(count($result['created'])." WO baru, {$result['existing']} sudah ada, ".count($result['skipped']).' dilewati.');
})->purpose('Tarik WO Produksi dari packingv2 yang belum ada di OPSEW (cadangan kiriman otomatis)');
