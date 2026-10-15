import { SlipStatement } from '@/domain/payout/slip-statement';
import { cn } from '@/lib/utils';
import type { PayoutSlipRecord } from '@/types/sewing';

type StatementListProps = {
    slip: Pick<PayoutSlipRecord, 'qty' | 'gross_amount' | 'bonus_amount' | 'deduction_amount' | 'net_amount'>;
    className?: string;
};

/** Ruled summary of a slip: pcs, kotor, bonus, potongan and the amount received. */
export function StatementList({ slip, className }: StatementListProps) {
    return (
        <dl className={cn('divide-y overflow-hidden rounded-lg border', className)}>
            {new SlipStatement(slip).rows().map((row) => (
                <div key={row.key} className={cn('flex items-baseline justify-between gap-4 px-4 py-3', row.emphasis && 'bg-muted/70')}>
                    <dt className={cn('text-base', row.emphasis ? 'font-bold uppercase' : 'text-muted-foreground')}>{row.label}</dt>
                    <dd className={cn('text-right font-bold tabular', row.emphasis ? 'font-display text-3xl' : 'text-lg')}>{row.value}</dd>
                </div>
            ))}
        </dl>
    );
}
