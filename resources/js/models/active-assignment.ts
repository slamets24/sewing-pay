import { joinMeta, progressPercent } from '@/lib/format';
import type { Assignment } from '@/types';

/** A pickup that is still being sewn, with the quick-input choices that make sense for it. */
export class ActiveAssignment {
    private static readonly quickStepSizes = [1, 5];

    constructor(readonly data: Assignment) {}

    get id(): number {
        return this.data.id;
    }

    get tailorId(): number {
        return this.data.tailor_id;
    }

    get tailorName(): string {
        return this.data.tailor_name;
    }

    get title(): string {
        return this.data.article_name;
    }

    get meta(): string {
        return joinMeta(this.data.color, this.data.size, this.data.work_type_name);
    }

    get remainingQty(): number {
        return this.data.remaining_qty;
    }

    get isOpen(): boolean {
        return this.data.remaining_qty > 0;
    }

    get canCancel(): boolean {
        return this.data.can_cancel;
    }

    get progress(): number {
        return progressPercent(this.data.completed_qty, this.data.assigned_qty);
    }

    get progressLabel(): string {
        return `${this.data.completed_qty}/${this.data.assigned_qty} pcs`;
    }

    /** Fixed steps smaller than what is left; the "finish the rest" button covers anything larger. */
    quickSteps(): number[] {
        return ActiveAssignment.quickStepSizes.filter((step) => step < this.remainingQty);
    }

    clampQty(qty: number): number {
        return Math.min(Math.max(1, Math.round(qty) || 1), this.remainingQty);
    }

    wageFor(qty: number): number {
        return qty * this.data.unit_rate_amount;
    }
}
