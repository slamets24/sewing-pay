import type { Tone } from '@/lib/tone';
import type { PayoutSlipLineRecord, PayoutSummary } from '@/types/sewing';

export type PayoutStatus = PayoutSummary['status'];
export type PayoutLineType = PayoutSlipLineRecord['type'];

/** Fixed colors for pay runs and slip lines: draft = yellow, paid = green; sewing = green, material revision = red. */
export class PayoutTone {
    static forStatus(status: PayoutStatus): Tone {
        return status === 'paid' ? 'done' : 'primary';
    }

    static forLineType(type: PayoutLineType): Tone {
        return type === 'revision' ? 'revision' : 'done';
    }
}
