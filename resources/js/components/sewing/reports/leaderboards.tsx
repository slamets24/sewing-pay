import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/empty-state';
import { formatIdr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Award,
    Shirt,
} from 'lucide-react';
import { useState } from 'react';
import type { TopArticle, TopTailor } from './types';

const TOP_COUNT = 5;

/** Most-made articles and most productive tailors; the first five each, the rest behind "Lihat semua". */
export function Leaderboards({ topArticles: allArticles, topTailors: allTailors }: { topArticles: TopArticle[]; topTailors: TopTailor[] }) {
    const [showAllArticles, setShowAllArticles] = useState(false);
    const [showAllTailors, setShowAllTailors] = useState(false);
    const topArticles = showAllArticles ? allArticles : allArticles.slice(0, TOP_COUNT);
    const topTailors = showAllTailors ? allTailors : allTailors.slice(0, TOP_COUNT);

    return (
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
            {/* COLUMN 1: TOP ARTIKEL PALING BANYAK DIKERJAKAN */}
            <Card asChild>
                <div className="flex flex-col gap-4 border border-border bg-card p-5 ">
                    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                                <Shirt className="size-4.5 text-primary" />
                                Artikel Terbanyak Dikerjakan
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Peringkat model pakaian berdasarkan volume pengerjaan
                            </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-muted-foreground">
                            {allArticles.length} model
                        </span>
                    </div>

                    {topArticles.length === 0 ? (
                        <EmptyState>Belum ada artikel disetor dalam periode ini.</EmptyState>
                    ) : (
                        <div className="flex flex-col gap-3.5">
                            {topArticles.slice(0, 7).map((article, idx) => (
                                <Card
                                    key={article.id}
                                    className="gap-2 bg-muted/15 p-3.5 transition-colors hover:bg-muted/30"
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
                                        <Progress value={article.percentage} aria-label={`Kontribusi ${article.name}`} className="flex-1 bg-muted" />
                                        <span className="text-[11px] font-bold text-muted-foreground w-12 text-right">
                                            {article.percentage}%
                                        </span>
                                    </div>

                                    {/* Variant Badges */}
                                    {article.variants.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                                            {article.variants.map((v) => (
                                                <Badge
                                                    key={v.label}
                                                    variant="outline"
                                                    className="max-w-full whitespace-normal text-[10px] text-muted-foreground"
                                                >
                                                    <span className="min-w-0 [overflow-wrap:anywhere]">{v.label}: <strong className="text-foreground">{v.qty}</strong></span>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                    {allArticles.length > TOP_COUNT && (
                        <Button variant="ghost" size="sm" className="self-center" onClick={() => setShowAllArticles(!showAllArticles)}>
                            {showAllArticles ? 'Tampilkan 5 teratas' : `Lihat semua (${allArticles.length} artikel)`}
                        </Button>
                    )}
                </div>
            </Card>

            {/* COLUMN 2: TOP PENJAHIT PALING PRODUKTIF (LEADERBOARD) */}
            <Card asChild>
                <div className="flex flex-col gap-4 border border-border bg-card p-5 ">
                    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                                <Award className="size-4.5 text-amber-600" />
                                Penjahit Paling Produktif
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Peringkat penjahit dengan output setoran tertinggi
                            </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-muted-foreground">
                            {allTailors.length} penjahit
                        </span>
                    </div>

                    {topTailors.length === 0 ? (
                        <EmptyState>Belum ada penjahit yang menyetor dalam periode ini.</EmptyState>
                    ) : (
                        <div className="flex flex-col gap-3.5">
                            {topTailors.slice(0, 7).map((tailor, idx) => (
                                <Card
                                    key={tailor.id}
                                    className="gap-2 bg-muted/15 p-3.5 transition-colors hover:bg-muted/30"
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
                                        <Progress value={tailor.percentage} aria-label={`Kontribusi ${tailor.name}`} className="flex-1 bg-muted" indicatorClassName="bg-amber-500" />
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
                                </Card>
                            ))}
                        </div>
                    )}
                    {allTailors.length > TOP_COUNT && (
                        <Button variant="ghost" size="sm" className="self-center" onClick={() => setShowAllTailors(!showAllTailors)}>
                            {showAllTailors ? 'Tampilkan 5 teratas' : `Lihat semua (${allTailors.length} penjahit)`}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
