import { Card } from '@/components/ui/card';
import { formatIdr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TrendDay } from './types';

/** Pieces deposited per day, one bar per day; tap or hover a bar for its details. */
export function TrendChart({ trend }: { trend: TrendDay[] }) {
    const [hoveredTrend, setHoveredTrend] = useState<TrendDay | null>(null);
    const maxDayQty = useMemo(() => {
        const max = Math.max(...trend.map((t) => t.qty), 0);
        return max > 0 ? max : 1;
    }, [trend]);

    return (
        <Card asChild>
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
                            Arahkan mouse atau ketuk batang untuk detail
                        </span>
                    )}
                </div>

                {/* Responsive Bar Chart */}
                <div className="relative pt-6 pb-2">
                    <div className="flex items-end gap-1.5 sm:gap-2.5 h-44 w-full">
                        {trend.map((day, index) => {
                            // On phones there is room for ~7 date labels; show every n-th one so they don't collide.
                            const labelStep = Math.max(1, Math.ceil(trend.length / 7));
                            const hideLabelOnPhone = (trend.length - 1 - index) % labelStep !== 0;
                            const heightPercent = Math.max(6, Math.round((day.qty / maxDayQty) * 100));
                            const isPeak = day.qty === maxDayQty && day.qty > 0;

                            return (
                                <div
                                    key={day.date}
                                    onMouseEnter={() => setHoveredTrend(day)}
                                    onMouseLeave={() => setHoveredTrend(null)}
                                    onClick={() => setHoveredTrend(day)}
                                    className="group relative flex min-w-0 flex-1 flex-col items-center h-full justify-end cursor-pointer"
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
                                    <span
                                        className={cn(
                                            'mt-2 text-[10px] font-bold whitespace-nowrap text-muted-foreground group-hover:text-foreground',
                                            hideLabelOnPhone && 'max-sm:invisible',
                                        )}
                                    >
                                        {day.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Card>
    );
}
