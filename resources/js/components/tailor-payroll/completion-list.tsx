import { ConfirmButton } from '@/components/confirm-button';
import { EmptyState } from '@/components/empty-state';
import { formatIdr, joinMeta } from '@/lib/format';
import { operationalService } from '@/services/operational-service';
import type { Completion } from '@/types';
import { useState } from 'react';

type CompletionListProps = {
    completions: Completion[];
    /** Shows a "Batalkan" button on entries the current user may still undo. */
    undoable?: boolean;
};

export function CompletionList({ completions, undoable = false }: CompletionListProps) {
    const [pendingId, setPendingId] = useState<number | null>(null);

    if (!completions.length) return <EmptyState>Belum ada qty selesai yang dicatat.</EmptyState>;

    const undo = (completion: Completion) =>
        operationalService.undoCompletion(completion.id, {
            onStart: () => setPendingId(completion.id),
            onFinish: () => setPendingId(null),
        });

    return (
        <div className="flex flex-col gap-2">
            {completions.map((completion) => (
                <article key={completion.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="font-medium">{completion.tailor_name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                            {completion.article_name} · {joinMeta(completion.color, completion.size, completion.work_type_name)}
                        </p>
                        {completion.completed_at && <p className="text-xs text-muted-foreground">{completion.completed_at}</p>}
                        {completion.notes && <p className="text-xs text-muted-foreground italic">{completion.notes}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                        <p className="font-semibold tabular-nums">{completion.completed_qty} pcs</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{formatIdr(completion.subtotal_amount)}</p>
                        {undoable && completion.can_undo && (
                            <ConfirmButton
                                size="xs"
                                variant="ghost"
                                className="-mr-1"
                                idleClassName="text-muted-foreground"
                                disabled={pendingId !== null}
                                confirmLabel="Ya, batalkan"
                                onConfirm={() => undo(completion)}
                            >
                                Batalkan
                            </ConfirmButton>
                        )}
                    </div>
                </article>
            ))}
        </div>
    );
}
