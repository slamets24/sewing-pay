import { PayoutRecord } from '@/domain/payout/payout-record';
import { formatIdr } from '@/lib/format';
import { ToneStyle } from '@/lib/tone';
import { cn } from '@/lib/utils';
import type { PayoutSummary } from '@/types/sewing';
import { Link } from '@inertiajs/react';
import { ChevronRight, Shirt, Users } from 'lucide-react';
import { PayoutStatusBadge } from './payout-status-badge';

/** One pay run in the history list; the whole card opens its detail page. */
export function PayoutCard({ payout }: { payout: PayoutSummary }) {
    const record = new PayoutRecord(payout);

    return (
        <Link
            href={route('payouts.show', payout.id)}
            className={cn(
                'flex h-full flex-col gap-3 rounded-lg border border-t-4 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none',
                ToneStyle.topBorder(record.tone),
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-display text-2xl leading-tight font-bold break-all uppercase">{payout.code}</p>
                    <p className="text-base text-muted-foreground">{record.cutoffLabel}</p>
                </div>
                <PayoutStatusBadge status={payout.status} label={payout.status_label} />
            </div>

            <p className="font-display text-4xl leading-none font-bold break-words tabular">{formatIdr(payout.total_amount)}</p>

            <p className="flex flex-wrap gap-x-5 gap-y-1 text-base">
                <span className="inline-flex items-center gap-1.5">
                    <Users className="size-5 text-muted-foreground" aria-hidden />
                    <span className="font-semibold tabular">{payout.total_tailors}</span> penjahit
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <Shirt className="size-5 text-muted-foreground" aria-hidden />
                    <span className="font-semibold tabular">{payout.total_qty}</span> pcs
                </span>
            </p>

            <div className="flex flex-col gap-1.5">
                <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className={cn('h-full rounded-full', ToneStyle.solid('done'))} style={{ width: `${record.paidPercent}%` }} />
                </div>
                <span className="text-sm font-semibold tabular">{record.paidLabel}</span>
            </div>

            {payout.notes && <p className="line-clamp-2 text-sm text-muted-foreground">{payout.notes}</p>}

            <span className="mt-auto inline-flex items-center gap-1 self-end text-base font-semibold">
                Buka
                <ChevronRight className="size-5" aria-hidden />
            </span>
        </Link>
    );
}
