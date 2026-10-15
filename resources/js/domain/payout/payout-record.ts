import { formatDate, progressPercent } from '@/lib/format';
import type { Tone } from '@/lib/tone';
import type { PayoutSummary } from '@/types/sewing';
import { PayoutTone } from './payout-tone';

/** One pay run as shown in the history list. */
export class PayoutRecord {
    constructor(readonly data: PayoutSummary) {}

    get tone(): Tone {
        return PayoutTone.forStatus(this.data.status);
    }

    get cutoffLabel(): string {
        return `s.d. ${formatDate(this.data.cutoff_date)}`;
    }

    get paidLabel(): string {
        return `${this.data.paid_slips_count}/${this.data.slips_count} slip dibayar`;
    }

    get paidPercent(): number {
        return this.data.slips_count === 0 ? 0 : progressPercent(this.data.paid_slips_count, this.data.slips_count);
    }

    static draftOf(payouts: PayoutSummary[]): PayoutSummary | null {
        return payouts.find((payout) => payout.is_draft) ?? null;
    }
}
