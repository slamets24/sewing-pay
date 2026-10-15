import { SlipAdjustment, type SlipAdjustmentInput } from '@/domain/payout/slip-adjustment';
import type { PayoutSlipRecord } from '@/types/sewing';
import { useForm } from '@inertiajs/react';

/** Bonus/potongan form of one slip, with the live "diterima" preview and the save/reset actions. */
export function useSlipAdjustment(slip: PayoutSlipRecord) {
    const form = useForm<SlipAdjustmentInput>(SlipAdjustment.inputFor(slip));
    const adjustment = SlipAdjustment.fromInput(slip.gross_amount, form.data);
    const dirty = !slip.is_paid && adjustment.differsFrom(slip, form.data.notes);
    const errors = form.errors as Partial<Record<keyof SlipAdjustmentInput | 'payout_slip', string>>;

    const save = () => {
        if (!adjustment.isValid || form.processing) return;

        form.transform((data) => SlipAdjustment.fromInput(slip.gross_amount, data).toPayload(data.notes));
        form.patch(route('payout-slips.update', slip.id), { preserveScroll: true });
    };

    const reset = () => {
        form.setData(SlipAdjustment.inputFor(slip));
        form.clearErrors();
    };

    return { form, adjustment, dirty, errors, save, reset };
}
