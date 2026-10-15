import type { PayoutSlipRecord } from '@/types/sewing';

/** Totals across the slips of one pay run: how much is paid, how much is still owed, who has no WhatsApp number. */
export class PayoutSlipSet {
    constructor(readonly slips: PayoutSlipRecord[]) {}

    get count(): number {
        return this.slips.length;
    }

    get paidCount(): number {
        return this.slips.filter((slip) => slip.is_paid).length;
    }

    get unpaidCount(): number {
        return this.count - this.paidCount;
    }

    get allPaid(): boolean {
        return this.count > 0 && this.unpaidCount === 0;
    }

    /** Money still to hand out for slips not marked paid yet. */
    get unpaidNet(): number {
        return this.sum((slip) => (slip.is_paid ? 0 : slip.net_amount));
    }

    get withoutWhatsappCount(): number {
        return this.slips.filter((slip) => slip.whatsapp_url === null).length;
    }

    get paidLabel(): string {
        return `${this.paidCount}/${this.count} slip dibayar`;
    }

    private sum(pick: (slip: PayoutSlipRecord) => number): number {
        return this.slips.reduce((total, slip) => total + pick(slip), 0);
    }
}
