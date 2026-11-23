import { formatIdr } from '@/lib/format';
import type { PayoutSlipLineRecord, PayoutSlipRecord } from '@/types/sewing';

export type StatementRow = {
    key: 'qty' | 'gross' | 'bonus' | 'deduction' | 'kasbon_warung' | 'kasbon_mingguan' | 'net';
    label: string;
    value: string;
    emphasis: boolean;
};

type SlipAmounts = Pick<PayoutSlipRecord, 'qty' | 'gross_amount' | 'bonus_amount' | 'deduction_amount' | 'net_amount'> &
    Partial<Pick<PayoutSlipRecord, 'kasbon_warung_amount' | 'kasbon_mingguan_amount'>>;

/** The money summary of one slip in reading order: pcs → kotor → + bonus → − potongan → − kasbon → diterima. */
export class SlipStatement {
    constructor(private readonly slip: SlipAmounts) {}

    rows(): StatementRow[] {
        const warung = this.slip.kasbon_warung_amount ?? 0;
        const mingguan = this.slip.kasbon_mingguan_amount ?? 0;
        const kasbonRows: StatementRow[] = [
            ...(warung > 0 ? [{ key: 'kasbon_warung' as const, label: 'Kasbon warung', value: `− ${formatIdr(warung)}`, emphasis: false }] : []),
            ...(mingguan > 0 ? [{ key: 'kasbon_mingguan' as const, label: 'Kasbon mingguan', value: `− ${formatIdr(mingguan)}`, emphasis: false }] : []),
        ];

        return [
            { key: 'qty', label: 'Jumlah jahit', value: `${this.slip.qty} pcs`, emphasis: false },
            { key: 'gross', label: 'Gaji kotor', value: formatIdr(this.slip.gross_amount), emphasis: false },
            { key: 'bonus', label: 'Bonus', value: `+ ${formatIdr(this.slip.bonus_amount)}`, emphasis: false },
            ...kasbonRows,
            { key: 'deduction', label: 'Potongan lain', value: `− ${formatIdr(this.slip.deduction_amount)}`, emphasis: false },
            { key: 'net', label: 'Diterima', value: formatIdr(this.slip.net_amount), emphasis: true },
        ];
    }

    /** Sum of the line subtotals, i.e. the gross pay. Qty is not summed: sewing pcs and revision parts do not add up. */
    static linesAmount(lines: PayoutSlipLineRecord[]): number {
        return lines.reduce((total, line) => total + line.subtotal, 0);
    }
}
