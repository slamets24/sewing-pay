import { ToneStyle, type Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';

export type QtyBreakdown = {
    printing_qty?: number;
    cutting_qty?: number;
    pending_qty?: number;
    available_qty: number;
    sewing_internal_qty?: number;
    sewing_makloon_qty?: number;
    sewing_qty: number;
    hold_qty?: number;
    delivered_qty: number;
};

type Segment = { key: keyof QtyBreakdown; label: string; tone: Tone };

/** Stacked bar of where every piece is: printing → cutting → warehouse → tailor / makloon (or waiting for a material fix) → done. */
export function QtyBar({ breakdown, showLegend = false, className }: { breakdown: QtyBreakdown; showLegend?: boolean; className?: string }) {
    const qty = (key: keyof QtyBreakdown) => breakdown[key] ?? 0;

    const segments: Segment[] = [];
    if (breakdown.printing_qty !== undefined || breakdown.cutting_qty !== undefined) {
        if (breakdown.printing_qty !== undefined) segments.push({ key: 'printing_qty', label: 'Printing', tone: 'other' });
        if (breakdown.cutting_qty !== undefined) segments.push({ key: 'cutting_qty', label: 'Cutting', tone: 'primary' });
    } else {
        segments.push({ key: 'pending_qty', label: 'Di divisi lain', tone: 'other' });
    }

    segments.push({ key: 'available_qty', label: 'Di gudang', tone: 'ready' });

    if (breakdown.sewing_internal_qty !== undefined || breakdown.sewing_makloon_qty !== undefined) {
        segments.push({ key: 'sewing_internal_qty', label: 'Penjahit', tone: 'sewing' });
        segments.push({ key: 'sewing_makloon_qty', label: 'Makloon', tone: 'qc' });
    } else {
        segments.push({ key: 'sewing_qty', label: 'Dijahit', tone: 'sewing' });
    }

    segments.push({ key: 'hold_qty', label: 'Menunggu revisi', tone: 'revision' });
    segments.push({ key: 'delivered_qty', label: 'Selesai', tone: 'done' });

    const total = segments.reduce((sum, segment) => sum + qty(segment.key), 0);
    const visible = segments.filter((segment) => (segment.key !== 'hold_qty' && segment.key !== 'printing_qty') || qty(segment.key) > 0);

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
