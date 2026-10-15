import { ToneStyle, type Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';

export type QtyBreakdown = {
    pending_qty: number;
    available_qty: number;
    sewing_qty: number;
    hold_qty?: number;
    delivered_qty: number;
};

const SEGMENTS: { key: keyof QtyBreakdown; label: string; tone: Tone }[] = [
    { key: 'pending_qty', label: 'Di divisi lain', tone: 'other' },
    { key: 'available_qty', label: 'Di gudang', tone: 'ready' },
    { key: 'sewing_qty', label: 'Dijahit', tone: 'sewing' },
    { key: 'hold_qty', label: 'Menunggu revisi', tone: 'revision' },
    { key: 'delivered_qty', label: 'Selesai', tone: 'done' },
];

/** Stacked bar of where every piece is: other division → warehouse → sewing (or waiting for a material fix) → done. */
export function QtyBar({ breakdown, showLegend = false, className }: { breakdown: QtyBreakdown; showLegend?: boolean; className?: string }) {
    const qty = (key: keyof QtyBreakdown) => breakdown[key] ?? 0;
    const total = SEGMENTS.reduce((sum, segment) => sum + qty(segment.key), 0);
    const visible = SEGMENTS.filter((segment) => segment.key !== 'hold_qty' || qty('hold_qty') > 0);

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={visible.map((s) => `${s.label} ${qty(s.key)}`).join(', ')}>
                {total > 0 &&
                    visible.filter((segment) => qty(segment.key) > 0).map((segment) => (
                        <span key={segment.key} className={cn('h-full', ToneStyle.solid(segment.tone))} style={{ width: `${(qty(segment.key) / total) * 100}%` }} />
                    ))}
            </div>
            {showLegend && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {visible.map((segment) => (
                        <span key={segment.key} className="flex items-center gap-1.5">
                            <span className={cn('size-2.5 rounded-full', ToneStyle.solid(segment.tone))} aria-hidden />
                            <span className="text-muted-foreground">{segment.label}</span>
                            <span className="font-semibold tabular">{qty(segment.key)}</span>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
