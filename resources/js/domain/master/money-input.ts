const grouping = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** Rupiah amounts are typed as plain digits; the dots are only added for reading. */
export class MoneyInput {
    /** Same ceiling as the server validation (max:10000000). */
    static readonly MAX = 10_000_000;

    static parse(text: string): number {
        const digits = text.replace(/\D/g, '').slice(0, 9);

        return digits === '' ? 0 : Math.min(Number(digits), MoneyInput.MAX);
    }

    /** Empty for 0 so the field shows its "0" placeholder and the user can type straight away. */
    static display(value: number): string {
        return value > 0 ? grouping.format(value) : '';
    }
}
