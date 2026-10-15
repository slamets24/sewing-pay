import type { FlashUndo } from '@/types';
import type { Errors, RequestPayload, VisitOptions } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

export type VisitHooks = {
    onStart?: () => void;
    onSuccess?: () => void;
    onFinish?: () => void;
};

type Method = 'post' | 'patch' | 'delete';

/**
 * One-tap floor actions (setor, batal, lanjut status…) sent as Inertia visits.
 * Keeps scroll and page state, and shows validation errors as a toast because there is no form field to attach them to.
 */
export class FloorActions {
    send(method: Method, url: string, data: RequestPayload = {}, hooks: VisitHooks = {}): void {
        if (method === 'delete') {
            router.delete(url, { ...this.options(hooks), data });

            return;
        }

        router[method](url, data, this.options(hooks));
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
            onError: (errors: Errors) => toast.error(FloorActions.firstError(errors)),
        };
    }

    static firstError(errors: Errors): string {
        return Object.values(errors)[0] ?? 'Gagal menyimpan. Coba lagi.';
    }
}

export const floorActions = new FloorActions();
