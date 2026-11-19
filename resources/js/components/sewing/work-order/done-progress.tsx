import { donePercent, whereabouts, type QtyCounters } from '@/domain/work-order/whereabouts';
import { cn } from '@/lib/utils';

/** "3 / 10 pcs selesai", a single progress bar, and one line saying where the rest is. */
export function DoneProgress({ qty, size = 'md', className }: { qty: QtyCounters; size?: 'md' | 'lg'; className?: string }) {
    const percent = donePercent(qty);
    const rest = whereabouts(qty);

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <p className={cn('tabular text-muted-foreground', size === 'lg' ? 'text-base' : 'text-sm')}>
                <span className={cn('font-bold text-foreground', size === 'lg' && 'font-display text-2xl')}>{qty.delivered_qty}</span> / {qty.planned_qty} pcs selesai
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-stage-done transition-all" style={{ width: `${percent}%` }} />
            </div>
            {rest && <p className={cn('text-muted-foreground', size === 'lg' ? 'text-base' : 'text-sm')}>{rest}</p>}
        </div>
    );
}
