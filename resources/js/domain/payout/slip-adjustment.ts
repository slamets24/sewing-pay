import type { PayoutSlipRecord } from '@/types/sewing';

export type SlipAdjustmentInput = {
    bonus_amount: string;
    deduction_amount: string;
    kasbon_warung_amount: string;
    kasbon_mingguan_amount: string;
    notes: string;
};

export type SlipAdjustmentPayload = {
    bonus_amount: number;
    deduction_amount: number;
    kasbon_warung_amount: number;
    kasbon_mingguan_amount: number;
    notes: string | null;
};

type SavedAmounts = Pick<PayoutSlipRecord, 'bonus_amount' | 'deduction_amount' | 'kasbon_warung_amount' | 'kasbon_mingguan_amount' | 'notes'>;

/**
 * Live preview of a slip's bonus/potongan/kasbon edit: diterima = kotor + bonus − potongan − kasbon warung − kasbon mingguan.
 * Mirrors the server rules (whole rupiah, max 100 jt each, diterima never below zero) so mistakes show before saving.
 */
export class SlipAdjustment {
    static readonly MAX_AMOUNT = 100_000_000;

    private constructor(
        readonly gross: number,
        readonly bonus: number,
        readonly deduction: number,
        readonly kasbonWarung: number = 0,
        readonly kasbonMingguan: number = 0,
    ) {}

    static fromInput(
        gross: number,
        input: Pick<SlipAdjustmentInput, 'bonus_amount' | 'deduction_amount'> & Partial<Pick<SlipAdjustmentInput, 'kasbon_warung_amount' | 'kasbon_mingguan_amount'>>,
    ): SlipAdjustment {
        return new SlipAdjustment(
            gross,
            SlipAdjustment.parseAmount(input.bonus_amount),
            SlipAdjustment.parseAmount(input.deduction_amount),
            SlipAdjustment.parseAmount(input.kasbon_warung_amount ?? ''),
            SlipAdjustment.parseAmount(input.kasbon_mingguan_amount ?? ''),
        );
    }

    /** Form values for a slip as saved on the server; zero shows as an empty field. */
    static inputFor(slip: SavedAmounts): SlipAdjustmentInput {
        const field = (amount: number | undefined) => ((amount ?? 0) > 0 ? String(amount) : '');

        return {
            bonus_amount: field(slip.bonus_amount),
            deduction_amount: field(slip.deduction_amount),
            kasbon_warung_amount: field(slip.kasbon_warung_amount),
            kasbon_mingguan_amount: field(slip.kasbon_mingguan_amount),
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

    /** Total yang dipotong: potongan lain + kasbon warung + kasbon mingguan. */
    get totalDeduction(): number {
        return this.deduction + this.kasbonWarung + this.kasbonMingguan;
    }

    get net(): number {
        return this.gross + this.bonus - this.totalDeduction;
    }

    get bonusError(): string | null {
        return this.bonus > SlipAdjustment.MAX_AMOUNT ? 'Bonus terlalu besar (maksimal Rp. 100 juta).' : null;
    }

    get deductionError(): string | null {
        if (Math.max(this.deduction, this.kasbonWarung, this.kasbonMingguan) > SlipAdjustment.MAX_AMOUNT) return 'Potongan terlalu besar (maksimal Rp. 100 juta).';
        if (this.net < 0) return 'Potongan dan kasbon tidak boleh melebihi gaji kotor ditambah bonus.';

        return null;
    }

    get isValid(): boolean {
        return this.bonusError === null && this.deductionError === null;
    }

    /** True when the typed amounts or notes differ from what is saved on the slip. */
    differsFrom(slip: SavedAmounts, notes: string): boolean {
        return (
            this.bonus !== slip.bonus_amount ||
            this.deduction !== slip.deduction_amount ||
            this.kasbonWarung !== (slip.kasbon_warung_amount ?? 0) ||
            this.kasbonMingguan !== (slip.kasbon_mingguan_amount ?? 0) ||
            notes.trim() !== (slip.notes ?? '').trim()
        );
    }

    toPayload(notes: string): SlipAdjustmentPayload {
        return {
            bonus_amount: this.bonus,
            deduction_amount: this.deduction,
            kasbon_warung_amount: this.kasbonWarung,
            kasbon_mingguan_amount: this.kasbonMingguan,
            notes: notes.trim() || null,
        };
    }
}
