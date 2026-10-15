import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatIdr } from '@/lib/format';
import type { ActiveAssignment } from '@/models/active-assignment';
import type { TailorBoard, TailorWorkload } from '@/models/tailor-board';
import { operationalService } from '@/services/operational-service';
import { CheckCheck, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { CompletionSheet } from './completion-sheet';

type TailorBoardViewProps = {
    board: TailorBoard;
    /** Called when an idle tailor is tapped, to start a pickup for them. */
    onPickup?: (tailorId: number) => void;
};

/** Home screen list: one card per busy tailor with one-tap completion buttons, then the idle tailors. */
export function TailorBoardView({ board, onPickup }: TailorBoardViewProps) {
    const [detail, setDetail] = useState<ActiveAssignment | null>(null);
    const [pendingId, setPendingId] = useState<number | null>(null);

    const record = (assignment: ActiveAssignment, qty: number) =>
        operationalService.recordCompletion(assignment.id, qty, {
            onStart: () => setPendingId(assignment.id),
            onFinish: () => setPendingId(null),
        });

    return (
        <div className="flex flex-col gap-3">
            {board.busy.length ? (
                board.busy.map((workload) => (
                    <WorkloadCard key={workload.tailorId} workload={workload} pendingId={pendingId} onRecord={record} onMore={setDetail} />
                ))
            ) : (
                <EmptyState>Belum ada penjahit yang sedang mengerjakan hancaan.</EmptyState>
            )}

            {onPickup && board.idle.length > 0 && (
                <section className="flex flex-col gap-2 pt-1">
                    <h3 className="text-sm font-medium text-muted-foreground">Belum ada kerjaan · ketuk untuk ambil hancaan</h3>
                    <div className="flex flex-wrap gap-2">
                        {board.idle.map((workload) => (
                            <Button key={workload.tailorId} size="sm" variant="outline" className="border-dashed" onClick={() => onPickup(workload.tailorId)}>
                                <Plus />
                                {workload.name}
                            </Button>
                        ))}
                    </div>
                </section>
            )}

            <CompletionSheet assignment={detail} onClose={() => setDetail(null)} />
        </div>
    );
}

type WorkloadCardProps = {
    workload: TailorWorkload;
    pendingId: number | null;
    onRecord: (assignment: ActiveAssignment, qty: number) => void;
    onMore: (assignment: ActiveAssignment) => void;
};

function WorkloadCard({ workload, pendingId, onRecord, onMore }: WorkloadCardProps) {
    return (
        <article className="overflow-hidden rounded-xl border bg-card">
            <header className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold" aria-hidden>
                    {workload.initials}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate leading-tight font-semibold">{workload.name}</h3>
                    <p className="truncate text-xs text-muted-foreground">{workload.summary}</p>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatIdr(workload.periodWage)}</p>
                    <p className="text-xs text-muted-foreground">periode ini</p>
                </div>
            </header>
            <ul className="divide-y border-t">
                {workload.assignments.map((assignment) => (
                    <AssignmentQuickRow
                        key={assignment.id}
                        assignment={assignment}
                        pending={pendingId === assignment.id}
                        locked={pendingId !== null}
                        onRecord={onRecord}
                        onMore={onMore}
                    />
                ))}
            </ul>
        </article>
    );
}

type AssignmentQuickRowProps = {
    assignment: ActiveAssignment;
    pending: boolean;
    locked: boolean;
    onRecord: (assignment: ActiveAssignment, qty: number) => void;
    onMore: (assignment: ActiveAssignment) => void;
};

function AssignmentQuickRow({ assignment, pending, locked, onRecord, onMore }: AssignmentQuickRowProps) {
    const describe = (qty: number) => `Catat ${qty} pcs selesai: ${assignment.tailorName}, ${assignment.title}`;

    return (
        <li className="flex flex-col gap-2 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm">
                    <span className="font-medium">{assignment.title}</span>
                    <span className="text-muted-foreground"> · {assignment.meta}</span>
                </p>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                    {pending && <Loader2 className="size-3 animate-spin" />}
                    {assignment.progressLabel}
                </span>
            </div>
            <Progress value={assignment.progress} className="h-1.5" />
            <div className="flex flex-wrap items-center gap-2">
                {assignment.quickSteps().map((step) => (
                    <Button key={step} size="sm" variant="outline" className="min-w-11" disabled={locked} aria-label={describe(step)} onClick={() => onRecord(assignment, step)}>
                        +{step}
                    </Button>
                ))}
                <Button size="sm" variant="secondary" disabled={locked} aria-label={describe(assignment.remainingQty)} onClick={() => onRecord(assignment, assignment.remainingQty)}>
                    <CheckCheck />
                    Sisa {assignment.remainingQty}
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto" disabled={locked} onClick={() => onMore(assignment)}>
                    Qty lain
                </Button>
            </div>
        </li>
    );
}
