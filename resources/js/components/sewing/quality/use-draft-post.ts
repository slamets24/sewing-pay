import { FloorActions } from '@/services/floor-actions';
import type { Errors, RequestPayload } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Sends a draft object as an Inertia POST, keeping scroll and page state.
 * Validation errors stay available for the fields and are also shown as a toast.
 */
export function useDraftPost() {
    const [errors, setErrors] = useState<Errors>({});
    const [processing, setProcessing] = useState(false);

    const post = (url: string, payload: RequestPayload, onSuccess?: () => void) => {
        router.post(url, payload, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => {
                setProcessing(true);
                setErrors({});
            },
            onSuccess: () => onSuccess?.(),
            onError: (next) => {
                setErrors(next);
                toast.error(FloorActions.firstError(next));
            },
            onFinish: () => setProcessing(false),
        });
    };

    return { post, errors, processing, clearErrors: () => setErrors({}) };
}

/** Errors that have no field of their own on the form (e.g. "Setoran ini sudah dicek QC."). */
export function looseErrors(errors: Errors, fieldKeys: (key: string) => boolean): string[] {
    return Object.entries(errors)
        .filter(([key]) => !fieldKeys(key))
        .map(([, message]) => String(message));
}
