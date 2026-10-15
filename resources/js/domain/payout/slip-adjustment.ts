import type { PayoutSlipRecord } from '@/types/sewing';

export type SlipAdjustmentInput = {
    bonus_amount: string;
    deduction_amount: string;
    notes: string;
};

export type SlipAdjustmentPayload = {
    bonus_amount: number;
    deduction_amount: number;
    notes: string | null;
};

/**
 * Live preview of a slip's bonus/potongan edit: diterima = kotor + bonus − potongan.
 * Mirrors the server rules (whole rupiah, max 100 jt each, diterima never below zero) so mistakes show before saving.
 */
export class SlipAdjustment {
    static readonly MAX_AMOUNT = 100_000_000;

    private constructor(
        readonly gross: number,
        readonly bonus: number,
        readonly deduction: number,
    ) {}

    static fromInput(gross: number, input: Pick<SlipAdjustmentInput, 'bonus_amount' | 'deduction_amount'>): SlipAdjustment {
        return new SlipAdjustment(gross, SlipAdjustment.parseAmount(input.bonus_amount), SlipAdjustment.parseAmount(input.deduction_amount));
    }

    /** Form values for a slip as saved on the server; zero shows as an empty field. */
    static inputFor(slip: Pick<PayoutSlipRecord, 'bonus_amount' | 'deduction_amount' | 'notes'>): SlipAdjustmentInput {
        return {
            bonus_amount: slip.bonus_amount > 0 ? String(slip.bonus_amount) : '',
            deduction_amount: slip.deduction_amount > 0 ? String(slip.deduction_amount) : '',
            notes: slip.notes ?? '',
        };
    }

    /** "50.000", "Rp 50000" or "" → whole rupiah. Anything that is not a digit is ignored. */
    static parseAmount(value: string): number {
        const digits = value.replace(/\D+/g, '');

        return digits === '' ? 0 : Number.parseInt(digits, 10);
    }

    /** Keeps only digits (and drops leading zeros) so the field never holds something the server rejects. */
    static cleanInput(value: string): string {
        return value.replace(/\D+/g, '').replace(/^0+(?=\d)/, '');
    }

    /** "1250000" → "1.250.000", so the zeros are easy to count while typing. */
    static groupDigits(digits: string): string {
        return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    get net(): number {
        return this.gross + this.bonus - this.deduction;
    }

    get bonusError(): string | null {
        return this.bonus > SlipAdjustment.MAX_AMOUNT ? 'Bonus terlalu besar (maksimal Rp 100 juta).' : null;
    }

    get deductionError(): string | null {
        if (this.deduction > SlipAdjustment.MAX_AMOUNT) return 'Potongan terlalu besar (maksimal Rp 100 juta).';
        if (this.net < 0) return 'Potongan tidak boleh melebihi gaji kotor ditambah bonus.';

        return null;
    }

    get isValid(): boolean {
        return this.bonusError === null && this.deductionError === null;
    }

    /** True when the typed amounts or notes differ from what is saved on the slip. */
    differsFrom(slip: Pick<PayoutSlipRecord, 'bonus_amount' | 'deduction_amount' | 'notes'>, notes: string): boolean {
        return this.bonus !== slip.bonus_amount || this.deduction !== slip.deduction_amount || notes.trim() !== (slip.notes ?? '').trim();
    }

    toPayload(notes: string): SlipAdjustmentPayload {
        return {
            bonus_amount: this.bonus,
            deduction_amount: this.deduction,
            notes: notes.trim() || null,
        };
    }
}
