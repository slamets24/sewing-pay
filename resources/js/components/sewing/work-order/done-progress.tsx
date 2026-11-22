import { donePercent, whereabouts, type QtyCounters } from '@/domain/work-order/whereabouts';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

/** "3 / 10 pcs selesai", a single progress bar, and one line saying where the rest is. */
export function DoneProgress({ qty, size = 'md', className }: { qty: QtyCounters; size?: 'md' | 'lg'; className?: string }) {
    const percent = donePercent(qty);
    const rest = whereabouts(qty);

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <p className={cn('tabular text-muted-foreground', size === 'lg' ? 'text-base' : 'text-sm')}>
                <span className={cn('font-bold text-foreground', size === 'lg' && 'font-display text-2xl')}>{qty.delivered_qty}</span> / {qty.planned_qty} pcs selesai
            </p>
            <Progress value={percent} aria-label="Selesai jahit" className="bg-muted" indicatorClassName="rounded-full bg-stage-done" />
            {rest && <p className={cn('text-muted-foreground', size === 'lg' ? 'text-base' : 'text-sm')}>{rest}</p>}
        </div>
    );
}
