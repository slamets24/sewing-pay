/** One of the two official payroll windows of a month: day 1-14 or day 15 to the end of the month. */
export class PayrollSlot {
    private static readonly monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'short' });

    private constructor(
        readonly startsAt: Date,
        readonly endsAt: Date,
    ) {}

    static containing(date: Date): PayrollSlot {
        const year = date.getFullYear();
        const month = date.getMonth();

        return date.getDate() <= 14
            ? new PayrollSlot(new Date(year, month, 1), new Date(year, month, 14))
            : new PayrollSlot(new Date(year, month, 15), new Date(year, month + 1, 0));
    }

    static containingIsoDate(isoDate: string): PayrollSlot {
        const [year, month, day] = isoDate.split('-').map(Number);

        return PayrollSlot.containing(new Date(year, month - 1, day));
    }

    get startsAtIso(): string {
        return PayrollSlot.toIsoDate(this.startsAt);
    }

    get endsAtIso(): string {
        return PayrollSlot.toIsoDate(this.endsAt);
    }

    previous(): PayrollSlot {
        return PayrollSlot.containing(PayrollSlot.addDays(this.startsAt, -1));
    }

    next(): PayrollSlot {
        return PayrollSlot.containing(PayrollSlot.addDays(this.endsAt, 1));
    }

    /** "15–31 Okt", or "15–31 Okt 2026" with the year. */
    label(withYear = false): string {
        const range = `${this.startsAt.getDate()}–${this.endsAt.getDate()} ${PayrollSlot.monthFormatter.format(this.startsAt)}`;

        return withYear ? `${range} ${this.startsAt.getFullYear()}` : range;
    }

    matches(startsAt: string, endsAt: string): boolean {
        return this.startsAtIso === startsAt && this.endsAtIso === endsAt;
    }

    private static toIsoDate(date: Date): string {
        const pad = (value: number) => String(value).padStart(2, '0');

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    private static addDays(date: Date, days: number): Date {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
    }
}
