import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatIdr, joinMeta, progressPercent } from '@/lib/format';
import type { Assignment } from '@/types';
import type { ReactNode } from 'react';

export function AssignmentProgress({ assignment, action }: { assignment: Assignment; action?: ReactNode }) {
    return (
        <article className="flex flex-col gap-3 rounded-lg border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{assignment.tailor_name}</h3>
                        <Badge variant="outline">{assignment.status_label}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                        {assignment.article_name} · {joinMeta(assignment.color, assignment.size, assignment.work_type_name)}
                    </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{formatIdr(assignment.running_subtotal)}</p>
            </div>
            <div className="flex flex-col gap-2">
                <Progress value={progressPercent(assignment.completed_qty, assignment.assigned_qty)} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        {assignment.completed_qty} dari {assignment.assigned_qty} pcs
                    </span>
                    <span>{assignment.remaining_qty} sisa</span>
                </div>
            </div>
            {action}
        </article>
    );
}
