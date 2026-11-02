<?php

namespace App\Http\Controllers\Sewing;

use App\Http\Controllers\Controller;
use App\Models\Revision;
use App\Models\SewingDelivery;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductionReportController extends Controller
{
    public function index(Request $request): Response
    {
        $preset = $request->string('preset', '14_days')->value();

        // Calculate date boundaries
        [$startDate, $endDate] = match ($preset) {
            '7_days' => [now()->subDays(6)->startOfDay(), now()->endOfDay()],
            '30_days' => [now()->subDays(29)->startOfDay(), now()->endOfDay()],
            'this_month' => [now()->startOfMonth()->startOfDay(), now()->endOfDay()],
            'custom' => [
                $request->date('from')?->startOfDay() ?? now()->subDays(13)->startOfDay(),
                $request->date('to')?->endOfDay() ?? now()->endOfDay(),
            ],
            default => [now()->subDays(13)->startOfDay(), now()->endOfDay()], // 14_days default
        };

        // Query all deliveries in this time range
        $deliveries = SewingDelivery::query()
            ->whereBetween('delivered_at', [$startDate, $endDate])
            ->with([
                'tailor',
                'shipment',
                'workOrderItem.article',
                'workOrderItem.workOrder',
            ])
            ->get();

        // Query revisions reported in this period
        $revisions = Revision::query()
            ->whereBetween('reported_at', [$startDate, $endDate])
            ->get();

        // High-level KPI metrics
        $totalQty = (int) $deliveries->sum('qty');
        $totalEarnings = (int) $deliveries->sum('subtotal');
        $activeDaysCount = $deliveries->groupBy(fn ($d) => $d->delivered_at->toDateString())->count();
        $activeTailorsCount = $deliveries->pluck('tailor_id')->unique()->count();
        $articlesCount = $deliveries->pluck('workOrderItem.article_id')->filter()->unique()->count();
        $totalRevisionQty = (int) $revisions->sum('qty');
        $qualityRate = ($totalQty + $totalRevisionQty) > 0
            ? round(($totalQty / ($totalQty + $totalRevisionQty)) * 100, 1)
            : 100.0;

        $stats = [
            'total_qty' => $totalQty,
            'total_earnings' => $totalEarnings,
            'daily_avg_qty' => (int) round($totalQty / max(1, $activeDaysCount)),
            'active_tailors_count' => $activeTailorsCount,
            'articles_count' => $articlesCount,
            'active_days_count' => $activeDaysCount,
            'total_revisions_qty' => $totalRevisionQty,
            'quality_rate' => $qualityRate,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'preset' => $preset,
        ];

        // Daily trend timeline
        $deliveriesByDate = $deliveries->groupBy(fn ($d) => $d->delivered_at->toDateString());
        $trend = [];
        $cursor = $startDate->copy()->startOfDay();
        $endCursor = $endDate->copy()->startOfDay();

        while ($cursor->lte($endCursor)) {
            $dateStr = $cursor->toDateString();
            $dayDeliveries = $deliveriesByDate->get($dateStr, collect());

            $trend[] = [
                'date' => $dateStr,
                'label' => $cursor->format('d/m'),
                'full_date' => $cursor->translatedFormat('d M Y'),
                'day_name' => $cursor->translatedFormat('D'),
                'qty' => (int) $dayDeliveries->sum('qty'),
                'earnings' => (int) $dayDeliveries->sum('subtotal'),
                'deliveries_count' => $dayDeliveries->count(),
            ];
            $cursor->addDay();
        }

        // Top articles breakdown
        $topArticles = $deliveries
            ->groupBy(fn ($d) => $d->workOrderItem?->article_id ?? 0)
            ->reject(fn ($group, $key) => $key === 0)
            ->map(function ($group) use ($totalQty) {
                $first = $group->first();
                $article = $first->workOrderItem->article;
                $groupQty = (int) $group->sum('qty');
                $groupEarnings = (int) $group->sum('subtotal');

                // Breakdown variants (color + size)
                $variants = $group
                    ->groupBy(fn ($d) => trim(($d->workOrderItem->color ?? '').' '.($d->workOrderItem->size ?? '')))
                    ->map(fn ($vg, $vName) => [
                        'label' => $vName ?: 'Standar',
                        'qty' => (int) $vg->sum('qty'),
                    ])
                    ->sortByDesc('qty')
                    ->take(4)
                    ->values();

                return [
                    'id' => $article->id,
                    'name' => $article->name,
                    'brand_name' => $article->brand_name,
                    'category_name' => $article->category_name,
                    'total_qty' => $groupQty,
                    'total_earnings' => $groupEarnings,
                    'percentage' => $totalQty > 0 ? round(($groupQty / $totalQty) * 100, 1) : 0,
                    'deliveries_count' => $group->count(),
                    'variants' => $variants,
                ];
            })
            ->sortByDesc('total_qty')
            ->values();

        // Top tailors breakdown (productivity leaderboard)
        $topTailors = $deliveries
            ->groupBy('tailor_id')
            ->map(function ($group) use ($totalQty) {
                $tailor = $group->first()->tailor;
                $groupQty = (int) $group->sum('qty');
                $groupEarnings = (int) $group->sum('subtotal');
                $days = $group->groupBy(fn ($d) => $d->delivered_at->toDateString())->count();

                // Top article worked on by this tailor
                $topArticle = $group
                    ->groupBy(fn ($d) => $d->workOrderItem?->article?->name ?? 'Lainnya')
                    ->sortByDesc(fn ($ag) => $ag->sum('qty'))
                    ->keys()
                    ->first();

                return [
                    'id' => $tailor->id,
                    'name' => $tailor->name,
                    'code' => $tailor->code,
                    'type' => $tailor->type->value,
                    'total_qty' => $groupQty,
                    'total_earnings' => $groupEarnings,
                    'percentage' => $totalQty > 0 ? round(($groupQty / $totalQty) * 100, 1) : 0,
                    'deliveries_count' => $group->count(),
                    'active_days' => $days,
                    'daily_avg' => (int) round($groupQty / max(1, $days)),
                    'top_article' => $topArticle,
                ];
            })
            ->sortByDesc('total_qty')
            ->values();

        // Detailed recent delivery logs (up to 100)
        $deliveryLogs = $deliveries
            ->sortByDesc('delivered_at')
            ->take(100)
            ->values()
            ->map(fn ($d) => [
                'id' => $d->id,
                'tailor_id' => $d->tailor_id,
                'tailor_name' => $d->tailor->name,
                'tailor_code' => $d->tailor->code,
                'article_name' => $d->workOrderItem?->article?->name ?? 'Item',
                'work_order_number' => $d->workOrderItem?->workOrder?->number ?? '-',
                'color' => $d->workOrderItem?->color,
                'size' => $d->workOrderItem?->size,
                'qty' => $d->qty,
                'sewing_rate' => $d->sewing_rate,
                'subtotal' => $d->subtotal,
                'is_payable' => $d->is_payable,
                'delivered_at' => $d->delivered_at->format('Y-m-d H:i'),
                'qc_shipment_number' => $d->shipment?->number,
            ]);

        return Inertia::render('Reports/Production', [
            'stats' => $stats,
            'trend' => $trend,
            'topArticles' => $topArticles,
            'topTailors' => $topTailors,
            'deliveryLogs' => $deliveryLogs,
            'filters' => [
                'preset' => $preset,
                'from' => $startDate->toDateString(),
                'to' => $endDate->toDateString(),
            ],
        ]);
    }
}
