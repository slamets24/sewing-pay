import type { PickupDraft } from '@/models/pickup-draft';
import type { FlashUndo } from '@/types';
import type { Errors, VisitOptions } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

export type VisitHooks = {
    onStart?: () => void;
    onSuccess?: () => void;
    onFinish?: () => void;
};

/**
 * One-tap operational actions (quick completion, undo, cancel pickup) sent as Inertia visits.
 * Keeps scroll and page state, and surfaces validation errors as a toast since there is no form to show them in.
 */
export class OperationalService {
    pickUp(draft: PickupDraft, hooks: VisitHooks = {}): void {
        router.post(route('assignments.store'), draft.toPayload(), this.options(hooks));
    }

    recordCompletion(assignmentId: number, completedQty: number, hooks: VisitHooks = {}): void {
        router.post(route('assignments.completions.store', assignmentId), { completed_qty: completedQty }, this.options(hooks));
    }

    cancelAssignment(assignmentId: number, hooks: VisitHooks = {}): void {
        router.post(route('assignments.cancel', assignmentId), {}, this.options(hooks));
    }

    undoCompletion(completionId: number, hooks: VisitHooks = {}): void {
        router.delete(route('completions.destroy', completionId), this.options(hooks));
    }

    /** Follows the undo link the server attached to the last flash message. */
    undo(link: FlashUndo, hooks: VisitHooks = {}): void {
        router.visit(link.url, { ...this.options(hooks), method: link.method });
    }

    private options(hooks: VisitHooks): Partial<VisitOptions> {
        return {
            preserveScroll: true,
            preserveState: true,
            onStart: hooks.onStart,
            onSuccess: hooks.onSuccess,
            onFinish: hooks.onFinish,
            onError: (errors: Errors) => toast.error(OperationalService.firstError(errors)),
        };
    }

    private static firstError(errors: Errors): string {
        return Object.values(errors)[0] ?? 'Gagal menyimpan. Coba lagi.';
    }
}

export const operationalService = new OperationalService();
