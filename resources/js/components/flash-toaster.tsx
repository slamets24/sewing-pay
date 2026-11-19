import { Toaster } from '@/components/ui/sonner';
import { floorActions } from '@/services/floor-actions';
import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

const UNDO_WINDOW_MS = 10000;

export function FlashToaster() {
    const { flash } = usePage<SharedData>().props;

    // Every Inertia visit yields a fresh flash object, so repeated identical messages still toast.
    useEffect(() => {
        // Failures that are not tied to a form field (e.g. a packingv2 / HR connection error).
        if (flash.error) toast.error(flash.error);

        if (!flash.status) return;

        const undo = flash.undo;

        toast.success(
            flash.status,
            undo
                ? {
                      duration: UNDO_WINDOW_MS,
                      action: { label: 'Batalkan', onClick: () => floorActions.undo(undo) },
                  }
                : undefined,
        );
    }, [flash]);

    return <Toaster position="top-center" richColors toastOptions={{ className: 'text-base' }} />;
}
