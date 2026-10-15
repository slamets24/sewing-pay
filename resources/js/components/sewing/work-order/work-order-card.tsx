import { QtyBar } from '@/components/sewing/qty-bar';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { dueLabel, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { WorkOrderSummary } from '@/types/sewing';
import { Link } from '@inertiajs/react';
import { CalendarClock, ChevronRight } from 'lucide-react';

/** One WO in a list: number, deadline, articles and where its pieces are. */
export function WorkOrderCard({ workOrder, compact = false }: { workOrder: WorkOrderSummary; compact?: boolean }) {
    const due = dueLabel(workOrder.due_at);

    return (
        <Link
            href={route('work-orders.show', workOrder.id)}
            className={cn(
                'surface-card group flex flex-col gap-3 p-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft-lg)] focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none',
                workOrder.is_overdue && 'border-stage-revision/50',
            )}
        >
            <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                    <p className="font-display text-2xl leading-tight font-bold">{workOrder.number}</p>
                    <p className="truncate text-sm text-muted-foreground">{[workOrder.channel, workOrder.category, formatDate(workOrder.ordered_at)].filter(Boolean).join(' · ')}</p>
                </div>
                <ChevronRight className="mt-1 size-6 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>

            <div className="flex flex-wrap gap-2">
                {workOrder.is_done ? (
                    <ToneBadge tone="done">Selesai jahit</ToneBadge>
                ) : (
                    due && (
                        <ToneBadge tone={workOrder.is_overdue ? 'revision' : 'neutral'}>
                            <CalendarClock className="size-4" />
                            {due}
                        </ToneBadge>
                    )
                )}
                {workOrder.is_opening_stock && <ToneBadge tone="ready">Stok awal</ToneBadge>}
            </div>

            {!compact && workOrder.article_names.length > 0 && <p className="line-clamp-2 text-base font-medium">{workOrder.article_names.join(', ')}</p>}

            <QtyBar breakdown={workOrder} />
            <p className="text-sm text-muted-foreground tabular">
                <span className="font-bold text-foreground">{workOrder.delivered_qty}</span> / {workOrder.planned_qty} pcs selesai
                {workOrder.available_qty > 0 && ` · ${workOrder.available_qty} siap diambil`}
                {workOrder.sewing_qty > 0 && ` · ${workOrder.sewing_qty} dijahit`}
            </p>
        </Link>
    );
}
