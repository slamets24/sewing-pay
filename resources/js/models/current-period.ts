import type { CurrentPeriodSummary } from '@/types';
import { PayrollSlot } from './payroll-slot';

type TailorTotal = CurrentPeriodSummary['tailors'][number];

/** The payroll slot today falls into, with what each tailor has earned in it so far. */
export class CurrentPeriod {
    readonly slot: PayrollSlot;
    private readonly totals: Map<number, TailorTotal>;

    constructor(private readonly summary: CurrentPeriodSummary) {
        this.slot = PayrollSlot.containingIsoDate(summary.starts_at);
        this.totals = new Map(summary.tailors.map((total) => [total.tailor_id, total]));
    }

    get label(): string {
        return this.slot.label();
    }

    get remainingLabel(): string {
        return this.summary.days_left === 0 ? 'hari terakhir' : `sisa ${this.summary.days_left} hari`;
    }

    get isLocked(): boolean {
        return this.summary.is_locked;
    }

    get statusLabel(): string {
        return this.summary.status_label ?? 'Belum dibuat';
    }

    get wageAmount(): number {
        return this.summary.wage_amount;
    }

    get completedQty(): number {
        return this.summary.completed_qty;
    }

    wageFor(tailorId: number): number {
        return this.totals.get(tailorId)?.wage_amount ?? 0;
    }

    qtyFor(tailorId: number): number {
        return this.totals.get(tailorId)?.completed_qty ?? 0;
    }
}
