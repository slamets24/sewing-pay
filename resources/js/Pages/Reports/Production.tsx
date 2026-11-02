import { EmptyState } from '@/components/empty-state';
import { PageIntro } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatIdr, variantLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import {
    Award,
    BarChart3,
    Calendar,
    CheckCircle2,
    Filter,
    PackageCheck,
    Search,
    Shirt,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type TrendDay = {
    date: string;
    label: string;
    full_date: string;
    day_name: string;
    qty: number;
    earnings: number;
    deliveries_count: number;
};

type TopArticleVariant = {
    label: string;
    qty: number;
};

type TopArticle = {
    id: number;
    name: string;
    brand_name: string | null;
    category_name: string | null;
    total_qty: number;
    total_earnings: number;
    percentage: number;
    deliveries_count: number;
    variants: TopArticleVariant[];
};

type TopTailor = {
    id: number;
    name: string;
    code: string | null;
    type: string;
    total_qty: number;
    total_earnings: number;
    percentage: number;
    deliveries_count: number;
    active_days: number;
    daily_avg: number;
    top_article: string | null;
};

type DeliveryLog = {
    id: number;
    tailor_id: number;
    tailor_name: string;
    tailor_code: string | null;
    article_name: string;
    work_order_number: string;
    color: string | null;
    size: string | null;
    qty: number;
    sewing_rate: number;
    subtotal: number;
    is_payable: boolean;
    delivered_at: string;
    qc_shipment_number: string | null;
};

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
    filters: ReportFilters;
};

export default function ProductionReport({
    stats,
    trend,
    topArticles,
    topTailors,
    deliveryLogs,
    filters,
}: ProductionReportProps) {
    const [selectedPreset, setSelectedPreset] = useState(filters.preset);
    const [customFrom, setCustomFrom] = useState(filters.from);
    const [customTo, setCustomTo] = useState(filters.to);
    const [activeTab, setActiveTab] = useState<'articles' | 'tailors' | 'logs'>('articles');
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredTrend, setHoveredTrend] = useState<TrendDay | null>(null);

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

    // Max daily qty for relative bar chart heights
    const maxDayQty = useMemo(() => {
        const max = Math.max(...trend.map((t) => t.qty), 0);
        return max > 0 ? max : 1;
    }, [trend]);

    // Search filter for articles
    const filteredArticles = useMemo(() => {
        if (!searchQuery) return topArticles;
        const q = searchQuery.toLowerCase();
        return topArticles.filter(
            (a) =>
                a.name.toLowerCase().includes(q) ||
                (a.brand_name && a.brand_name.toLowerCase().includes(q)),
        );
    }, [topArticles, searchQuery]);

    // Search filter for tailors
    const filteredTailors = useMemo(() => {
        if (!searchQuery) return topTailors;
        const q = searchQuery.toLowerCase();
        return topTailors.filter(
            (t) =>
                t.name.toLowerCase().includes(q) ||
                (t.code && t.code.toLowerCase().includes(q)),
        );
    }, [topTailors, searchQuery]);

    // Search filter for delivery logs
    const filteredLogs = useMemo(() => {
        if (!searchQuery) return deliveryLogs;
        const q = searchQuery.toLowerCase();
        return deliveryLogs.filter(
            (l) =>
                l.tailor_name.toLowerCase().includes(q) ||
                l.article_name.toLowerCase().includes(q) ||
                l.work_order_number.toLowerCase().includes(q),
        );
    }, [deliveryLogs, searchQuery]);

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

                {/* DAILY OUTPUT TREND CHART */}
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                        <div>
                            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                                <BarChart3 className="size-4.5 text-primary" />
                                Tren Output Jahitan Harian
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Jumlah pcs yang disetor per hari selama periode ({trend.length} hari)
                            </p>
                        </div>
                        {hoveredTrend ? (
                            <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-1.5 text-xs">
                                <span className="font-bold text-foreground">{hoveredTrend.full_date} ({hoveredTrend.day_name}):</span>
                                <span className="font-black text-emerald-600">+{hoveredTrend.qty} pcs</span>
                                <span className="text-muted-foreground">· {formatIdr(hoveredTrend.earnings)}</span>
                            </div>
                        ) : (
                            <span className="text-xs font-medium text-muted-foreground">
                                Arahkan mouse ke grafik batang untuk detail
                            </span>
                        )}
                    </div>

                    {/* Responsive Bar Chart */}
                    <div className="relative pt-6 pb-2">
                        <div className="flex items-end gap-1.5 sm:gap-2.5 h-44 w-full">
                            {trend.map((day) => {
                                const heightPercent = Math.max(6, Math.round((day.qty / maxDayQty) * 100));
                                const isPeak = day.qty === maxDayQty && day.qty > 0;

                                return (
                                    <div
                                        key={day.date}
                                        onMouseEnter={() => setHoveredTrend(day)}
                                        onMouseLeave={() => setHoveredTrend(null)}
                                        className="group relative flex flex-1 flex-col items-center h-full justify-end cursor-pointer"
                                    >
                                        {/* Value Pill Above Bar */}
                                        {day.qty > 0 && (
                                            <span
                                                className={cn(
                                                    'mb-1.5 text-[10px] font-black tabular transition-all',
                                                    isPeak
                                                        ? 'text-primary scale-110'
                                                        : 'text-muted-foreground group-hover:text-foreground',
                                                )}
                                            >
                                                {day.qty}
                                            </span>
                                        )}

                                        {/* Bar Pillar */}
                                        <div
                                            style={{ height: `${day.qty > 0 ? heightPercent : 4}%` }}
                                            className={cn(
                                                'w-full max-w-[36px] rounded-t-lg transition-all duration-200 group-hover:brightness-110',
                                                day.qty === 0
                                                    ? 'bg-muted/30'
                                                    : isPeak
                                                      ? 'bg-gradient-to-t from-primary to-primary/80 shadow-xs ring-2 ring-primary/20'
                                                      : 'bg-emerald-600/80 hover:bg-emerald-600',
                                            )}
                                        />

                                        {/* X-axis Date Label */}
                                        <span className="mt-2 text-[10px] font-bold text-muted-foreground group-hover:text-foreground truncate">
                                            {day.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 2-COLUMN SECTION: TOP ARTICLES & TOP TAILORS */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* COLUMN 1: TOP ARTIKEL PALING BANYAK DIKERJAKAN */}
                    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <div>
                                <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                                    <Shirt className="size-4.5 text-primary" />
                                    Artikel Terbanyak Dikerjakan
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Peringkat model pakaian berdasarkan volume pengerjaan
                                </p>
                            </div>
                            <span className="text-xs font-bold text-muted-foreground">
                                {topArticles.length} model
                            </span>
                        </div>

                        {topArticles.length === 0 ? (
                            <EmptyState>Belum ada artikel disetor dalam periode ini.</EmptyState>
                        ) : (
                            <div className="flex flex-col gap-3.5">
                                {topArticles.slice(0, 7).map((article, idx) => (
                                    <div
                                        key={article.id}
                                        className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/15 p-3.5 transition-all hover:bg-muted/30"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span
                                                    className={cn(
                                                        'flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-black',
                                                        idx === 0
                                                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold'
                                                            : idx === 1
                                                              ? 'bg-slate-300/40 text-slate-700 dark:text-slate-300'
                                                              : idx === 2
                                                                ? 'bg-amber-800/20 text-amber-800 dark:text-amber-400'
                                                                : 'bg-muted text-muted-foreground',
                                                    )}
                                                >
                                                    #{idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="font-display font-bold text-foreground text-sm truncate">
                                                        {article.name}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {article.brand_name || 'Brand Sendiri'} {article.category_name ? `· ${article.category_name}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="font-display font-black text-emerald-600 text-base">
                                                    {article.total_qty} pcs
                                                </span>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {formatIdr(article.total_earnings)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Bar of Total Production */}
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    style={{ width: `${article.percentage}%` }}
                                                    className="h-full rounded-full bg-primary"
                                                />
                                            </div>
                                            <span className="text-[11px] font-bold text-muted-foreground w-12 text-right">
                                                {article.percentage}%
                                            </span>
                                        </div>

                                        {/* Variant Badges */}
                                        {article.variants.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                                                {article.variants.map((v) => (
                                                    <span
                                                        key={v.label}
                                                        className="rounded-md bg-card border border-border/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                                                    >
                                                        {v.label}: <strong className="text-foreground">{v.qty}</strong>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* COLUMN 2: TOP PENJAHIT PALING PRODUKTIF (LEADERBOARD) */}
                    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <div>
                                <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                                    <Award className="size-4.5 text-amber-600" />
                                    Penjahit Paling Produktif
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Peringkat penjahit dengan output setoran tertinggi
                                </p>
                            </div>
                            <span className="text-xs font-bold text-muted-foreground">
                                {topTailors.length} penjahit
                            </span>
                        </div>

                        {topTailors.length === 0 ? (
                            <EmptyState>Belum ada penjahit yang menyetor dalam periode ini.</EmptyState>
                        ) : (
                            <div className="flex flex-col gap-3.5">
                                {topTailors.slice(0, 7).map((tailor, idx) => (
                                    <div
                                        key={tailor.id}
                                        className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/15 p-3.5 transition-all hover:bg-muted/30"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span
                                                    className={cn(
                                                        'flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-black',
                                                        idx === 0
                                                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold'
                                                            : idx === 1
                                                              ? 'bg-slate-300/40 text-slate-700 dark:text-slate-300'
                                                              : idx === 2
                                                                ? 'bg-amber-800/20 text-amber-800 dark:text-amber-400'
                                                                : 'bg-muted text-muted-foreground',
                                                    )}
                                                >
                                                    #{idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="font-display font-bold text-foreground text-sm truncate flex items-center gap-1.5">
                                                        {tailor.name}
                                                        {tailor.code && (
                                                            <span className="text-[10px] font-mono text-muted-foreground">
                                                                ({tailor.code})
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {tailor.type === 'makloon' ? 'Makloon' : 'Penjahit Borongan'} · {tailor.active_days} hari aktif (rata-rata {tailor.daily_avg} pcs/hari)
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="font-display font-black text-emerald-600 text-base">
                                                    {tailor.total_qty} pcs
                                                </span>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {formatIdr(tailor.total_earnings)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Bar Contribution */}
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    style={{ width: `${tailor.percentage}%` }}
                                                    className="h-full rounded-full bg-amber-500"
                                                />
                                            </div>
                                            <span className="text-[11px] font-bold text-muted-foreground w-12 text-right">
                                                {tailor.percentage}%
                                            </span>
                                        </div>

                                        {/* Top article for this tailor */}
                                        {tailor.top_article && (
                                            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                                Fokus artikel utama: <strong className="text-foreground">{tailor.top_article}</strong>
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* DETAILED DATA TABLES (TABBED) */}
                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                        {/* Tab Switchers */}
                        <div className="flex rounded-xl bg-muted/60 p-1 border border-border/60">
                            <button
                                type="button"
                                onClick={() => setActiveTab('articles')}
                                className={cn(
                                    'rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                                    activeTab === 'articles'
                                        ? 'bg-card text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                Rekap Per Artikel ({topArticles.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('tailors')}
                                className={cn(
                                    'rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                                    activeTab === 'tailors'
                                        ? 'bg-card text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                Rekap Per Penjahit ({topTailors.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('logs')}
                                className={cn(
                                    'rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                                    activeTab === 'logs'
                                        ? 'bg-card text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                Log Riwayat Setoran ({deliveryLogs.length})
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama artikel / penjahit..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 pl-8 text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    {/* TAB 1: REKAP ARTIKEL TABLE */}
                    {activeTab === 'articles' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[10px]">
                                        <th className="py-2.5 px-3 font-bold">No</th>
                                        <th className="py-2.5 px-3 font-bold">Artikel</th>
                                        <th className="py-2.5 px-3 font-bold">Brand / Kategori</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Total Pcs</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Kontribusi</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Total Upah</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Frekuensi Setor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {filteredArticles.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                                Tidak ada artikel yang cocok.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredArticles.map((a, idx) => (
                                            <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-3 font-mono text-muted-foreground">{idx + 1}</td>
                                                <td className="py-3 px-3 font-bold text-foreground text-sm">{a.name}</td>
                                                <td className="py-3 px-3 text-muted-foreground">{a.brand_name || '-'} {a.category_name ? `· ${a.category_name}` : ''}</td>
                                                <td className="py-3 px-3 text-right font-display font-black text-emerald-600 text-sm">
                                                    {a.total_qty} pcs
                                                </td>
                                                <td className="py-3 px-3 text-right font-semibold text-muted-foreground">
                                                    {a.percentage}%
                                                </td>
                                                <td className="py-3 px-3 text-right font-semibold text-foreground">
                                                    {formatIdr(a.total_earnings)}
                                                </td>
                                                <td className="py-3 px-3 text-right text-muted-foreground font-mono">
                                                    {a.deliveries_count}x
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB 2: REKAP PENJAHIT TABLE */}
                    {activeTab === 'tailors' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[10px]">
                                        <th className="py-2.5 px-3 font-bold">No</th>
                                        <th className="py-2.5 px-3 font-bold">Nama Penjahit</th>
                                        <th className="py-2.5 px-3 font-bold">Tipe</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Total Pcs</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Kontribusi</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Hari Aktif</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Rata-rata/Hari</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Total Upah</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {filteredTailors.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-muted-foreground">
                                                Tidak ada data penjahit yang cocok.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTailors.map((t, idx) => (
                                            <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-3 font-mono text-muted-foreground">{idx + 1}</td>
                                                <td className="py-3 px-3 font-bold text-foreground text-sm">
                                                    {t.name}
                                                    {t.code && <span className="ml-1 text-xs font-mono font-normal text-muted-foreground">({t.code})</span>}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <ToneBadge tone={t.type === 'makloon' ? 'other' : 'ready'}>
                                                        {t.type === 'makloon' ? 'Makloon' : 'Borongan'}
                                                    </ToneBadge>
                                                </td>
                                                <td className="py-3 px-3 text-right font-display font-black text-emerald-600 text-sm">
                                                    {t.total_qty} pcs
                                                </td>
                                                <td className="py-3 px-3 text-right font-semibold text-muted-foreground">
                                                    {t.percentage}%
                                                </td>
                                                <td className="py-3 px-3 text-right text-muted-foreground font-mono">
                                                    {t.active_days} hari
                                                </td>
                                                <td className="py-3 px-3 text-right font-semibold text-foreground">
                                                    {t.daily_avg} pcs
                                                </td>
                                                <td className="py-3 px-3 text-right font-bold text-foreground">
                                                    {formatIdr(t.total_earnings)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB 3: LOG RIWAYAT SETORAN TABLE */}
                    {activeTab === 'logs' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[10px]">
                                        <th className="py-2.5 px-3 font-bold">Waktu</th>
                                        <th className="py-2.5 px-3 font-bold">Penjahit</th>
                                        <th className="py-2.5 px-3 font-bold">Artikel & Varian</th>
                                        <th className="py-2.5 px-3 font-bold">WO</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Qty</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Tarif</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Subtotal</th>
                                        <th className="py-2.5 px-3 font-bold text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-muted-foreground">
                                                Tidak ada catatan setoran yang cocok.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map((l) => (
                                            <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{l.delivered_at}</td>
                                                <td className="py-3 px-3 font-bold text-foreground">{l.tailor_name}</td>
                                                <td className="py-3 px-3">
                                                    <span className="font-bold text-foreground">{l.article_name}</span>
                                                    {(l.color || l.size) && (
                                                        <span className="text-muted-foreground ml-1">({variantLabel(l.color, l.size)})</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 font-mono text-muted-foreground">{l.work_order_number}</td>
                                                <td className="py-3 px-3 text-right font-display font-black text-emerald-600 text-sm">
                                                    +{l.qty} pcs
                                                </td>
                                                <td className="py-3 px-3 text-right text-muted-foreground font-mono">
                                                    {formatIdr(l.sewing_rate)}
                                                </td>
                                                <td className="py-3 px-3 text-right font-semibold text-foreground">
                                                    {formatIdr(l.subtotal)}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    {l.qc_shipment_number ? (
                                                        <ToneBadge tone="qc">QC {l.qc_shipment_number}</ToneBadge>
                                                    ) : (
                                                        <ToneBadge tone="neutral">Di Loket</ToneBadge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
