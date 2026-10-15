import { Badge } from '@/components/ui/badge';
import { formatIdr } from '@/lib/format';
import type { CurrentPeriod } from '@/models/current-period';

/** Page header that keeps the running payroll period in view while entering work. */
export function PeriodHeader({ eyebrow, period }: { eyebrow: string; period: CurrentPeriod }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
                <h1 className="text-xl font-semibold">Periode {period.label}</h1>
                <p className="text-sm text-muted-foreground">
                    {period.remainingLabel} · gaji berjalan <span className="font-medium text-foreground tabular-nums">{formatIdr(period.wageAmount)}</span>
                </p>
            </div>
            {period.isLocked && (
                <Badge variant="destructive" className="shrink-0">
                    {period.statusLabel}
                </Badge>
            )}
        </div>
    );
}
