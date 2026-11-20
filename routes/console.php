<?php

use App\Actions\Sewing\ApplyArticleRateAction;
use App\Actions\Sewing\PullPackingWorkOrdersAction;
use App\Models\Article;
use App\Support\Access\AbilityAudit;
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

Artisan::command('abilities:audit', function (AbilityAudit $audit) {
    $report = $audit->report();
    $this->info("{$report['route_count']} route staff · {$report['ability_count']} ability di katalog (app/Enums/Ability.php)");

    $rows = fn (array $items) => array_map(fn (array $row) => [$row['methods'], $row['uri'], $row['name'], $row['ability'] ?? ''], $items);

    if ($report['unguarded_routes'] !== []) {
        $this->error('Route tanpa ability (semua role yang bisa login dapat membukanya):');
        $this->table(['Method', 'URI', 'Nama', ''], $rows($report['unguarded_routes']));
    }

    if ($report['undefined_abilities'] !== []) {
        $this->error('Route memakai ability yang belum ada di katalog:');
        $this->table(['Method', 'URI', 'Nama', 'Ability'], $rows($report['undefined_abilities']));
    }

    if ($report['unused_abilities'] !== []) {
        $this->warn('Ability di katalog yang tidak dipakai route mana pun: '.implode(', ', $report['unused_abilities']));
    }

    foreach ($report['stale_role_abilities'] as $row) {
        $this->warn("Role {$row['role']} menyimpan ability yang sudah tidak ada: ".implode(', ', $row['abilities']));
    }

    if ($audit->isClean()) {
        $this->info('Semua route staff sudah dijaga ability, dan semua ability terpakai.');

        return 0;
    }

    return 1;
})->purpose('Cek route yang belum punya ability, ability yang belum didaftarkan, dan ability usang di role');
