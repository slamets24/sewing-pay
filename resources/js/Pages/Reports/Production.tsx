import { PageIntro } from '@/components/sewing/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatIdr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import {
    Calendar,
    CheckCircle2,
    Filter,
    PackageCheck,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { DetailTables } from '@/components/sewing/reports/detail-tables';
import { DistributionCharts } from '@/components/sewing/reports/distribution-charts';
import type { Distribution } from '@/domain/report/distribution';
import { Leaderboards } from '@/components/sewing/reports/leaderboards';
import { TrendChart } from '@/components/sewing/reports/trend-chart';
import type { DeliveryLog, TopArticle, TopTailor, TrendDay } from '@/components/sewing/reports/types';

type ReportStats = {
    total_qty: number;
    total_earnings: number;
    daily_avg_qty: number;
    active_tailors_count: number;
    articles_count: number;
    active_days_count: number;
    total_revisions_qty: number;
    quality_rate: number;
    start_date: string;
    end_date: string;
    preset: string;
};

type ReportFilters = {
    preset: string;
    from: string;
    to: string;
};

type ProductionReportProps = {
    stats: ReportStats;
    trend: TrendDay[];
    topArticles: TopArticle[];
    topTailors: TopTailor[];
    deliveryLogs: DeliveryLog[];
    distribution: Distribution;
    filters: ReportFilters;
};

export default function ProductionReport({
    stats,
    trend,
    topArticles,
    topTailors,
    deliveryLogs,
    distribution,
    filters,
}: ProductionReportProps) {
    const [selectedPreset, setSelectedPreset] = useState(filters.preset);
    const [customFrom, setCustomFrom] = useState(filters.from);
    const [customTo, setCustomTo] = useState(filters.to);

    // Apply preset filter
    const applyPreset = (preset: string) => {
        setSelectedPreset(preset);
        router.get(
            route('production-reports.index'),
            { preset },
            { preserveState: true, preserveScroll: true },
        );
    };

    // Apply custom date range
    const applyCustomRange = () => {
        router.get(
            route('production-reports.index'),
            { preset: 'custom', from: customFrom, to: customTo },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AppLayout title="Rekap & Analitik Produksi">
            <div className="flex flex-col gap-6">
                {/* Page Intro with Date Range Controls */}
                <PageIntro
                    actions={
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="sm" className="rounded-xl shadow-xs">
                                <Link href={route('desk.index')}>
                                    Buka Meja Loket
                                </Link>
                            </Button>
                        </div>
                    }
                >
                    Analisis output produksi jahitan, variasi artikel terpopuler, dan peringkat produktivitas penjahit workshop.
                </PageIntro>

                {/* FILTER CONTROLS BAR */}
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                    {/* Preset Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Filter className="size-3.5" />
                            Periode:
                        </span>
                        {[
                            { id: '7_days', label: '7 Hari' },
                            { id: '14_days', label: '2 Minggu (14 Hari)' },
                            { id: '30_days', label: '30 Hari' },
                            { id: 'this_month', label: 'Bulan Ini' },
                            { id: 'custom', label: 'Kustom' },
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                type="button"
                                onClick={() => applyPreset(btn.id)}
                                className={cn(
                                    'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                                    selectedPreset === btn.id
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom Range Picker (shown when custom is selected or on right side) */}
                    {selectedPreset === 'custom' ? (
                        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                            <Input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="h-8 w-36 rounded-lg text-xs"
                            />
                            <span className="text-xs text-muted-foreground">s/d</span>
                            <Input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="h-8 w-36 rounded-lg text-xs"
                            />
                            <Button
                                size="sm"
                                onClick={applyCustomRange}
                                className="h-8 rounded-lg text-xs font-bold px-3"
                            >
                                Terapkan
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Calendar className="size-3.5 text-primary" />
                            <span>
                                {formatDate(stats.start_date)} — {formatDate(stats.end_date)}
                            </span>
                        </div>
                    )}
                </div>

                {/* 5 KEY KPI STAT TILES */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {/* Metric 1: Total Produksi */}
                    <div className="flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-bold uppercase tracking-wider">Total Disetor</span>
                            <PackageCheck className="size-4 text-emerald-600" />
                        </div>
                        <div className="mt-3">
                            <span className="font-display text-3xl font-black text-emerald-700 dark:text-emerald-400 tabular">
                                {stats.total_qty.toLocaleString('id-ID')}
                            </span>
                            <span className="ml-1 text-xs font-bold text-muted-foreground">pcs</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            Dari {stats.active_days_count} hari aktif produksi
                        </p>
                    </div>

                    {/* Metric 2: Rata-Rata Harian */}
                    <div className="flex flex-col justify-between rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-bold uppercase tracking-wider">Rata-Rata / Hari</span>
                            <TrendingUp className="size-4 text-blue-600" />
                        </div>
                        <div className="mt-3">
                            <span className="font-display text-3xl font-black text-blue-700 dark:text-blue-400 tabular">
                                {stats.daily_avg_qty.toLocaleString('id-ID')}
                            </span>
                            <span className="ml-1 text-xs font-bold text-muted-foreground">pcs/hari</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            Kecepatan output workshop
                        </p>
                    </div>

                    {/* Metric 3: Total Nilai Upah */}
                    <div className="flex flex-col justify-between rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-bold uppercase tracking-wider">Nilai Upah</span>
                            <Wallet className="size-4 text-indigo-600" />
                        </div>
                        <div className="mt-3">
                            <span className="font-display text-2xl font-black text-indigo-700 dark:text-indigo-400 tabular">
                                {formatIdr(stats.total_earnings)}
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            Biaya ongkos jahit terakumulasi
                        </p>
                    </div>

                    {/* Metric 4: Penjahit & Artikel */}
                    <div className="flex flex-col justify-between rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-bold uppercase tracking-wider">Kapasitas Tim</span>
                            <Users className="size-4 text-amber-600" />
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="font-display text-3xl font-black text-amber-700 dark:text-amber-400 tabular">
                                {stats.active_tailors_count}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground">penjahit</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            Mengerjakan {stats.articles_count} model artikel
                        </p>
                    </div>

                    {/* Metric 5: Kualitas / Lolos QC */}
                    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-xs col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-bold uppercase tracking-wider">Kualitas Hasil</span>
                            <CheckCircle2 className="size-4 text-emerald-600" />
                        </div>
                        <div className="mt-3">
                            <span className="font-display text-3xl font-black text-foreground tabular">
                                {stats.quality_rate}%
                            </span>
                            <span className="ml-1 text-xs font-bold text-muted-foreground">lolos</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                            {stats.total_revisions_qty > 0 ? `${stats.total_revisions_qty} pcs tercatat revisi` : 'Nol komplain jahitan'}
                        </p>
                    </div>
                </div>

                <TrendChart trend={trend} />

                <DistributionCharts distribution={distribution} />

                <Leaderboards topArticles={topArticles} topTailors={topTailors} />

                <DetailTables topArticles={topArticles} topTailors={topTailors} deliveryLogs={deliveryLogs} />
            </div>
        </AppLayout>
    );
}
