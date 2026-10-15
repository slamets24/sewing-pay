import { formatIdr } from '@/lib/format';
import type { PayoutSlipLineRecord, PayoutSlipRecord } from '@/types/sewing';

export type StatementRow = {
    key: 'qty' | 'gross' | 'bonus' | 'deduction' | 'net';
    label: string;
    value: string;
    emphasis: boolean;
};

type SlipAmounts = Pick<PayoutSlipRecord, 'qty' | 'gross_amount' | 'bonus_amount' | 'deduction_amount' | 'net_amount'>;

/** The money summary of one slip in reading order: pcs → kotor → + bonus → − potongan → diterima. */
export class SlipStatement {
    constructor(private readonly slip: SlipAmounts) {}

    rows(): StatementRow[] {
        return [
            { key: 'qty', label: 'Jumlah jahit', value: `${this.slip.qty} pcs`, emphasis: false },
            { key: 'gross', label: 'Gaji kotor', value: formatIdr(this.slip.gross_amount), emphasis: false },
            { key: 'bonus', label: 'Bonus', value: `+ ${formatIdr(this.slip.bonus_amount)}`, emphasis: false },
            { key: 'deduction', label: 'Potongan', value: `− ${formatIdr(this.slip.deduction_amount)}`, emphasis: false },
            { key: 'net', label: 'Diterima', value: formatIdr(this.slip.net_amount), emphasis: true },
        ];
    }

    /** Sum of the line subtotals, i.e. the gross pay. Qty is not summed: sewing pcs and revision parts do not add up. */
    static linesAmount(lines: PayoutSlipLineRecord[]): number {
        return lines.reduce((total, line) => total + line.subtotal, 0);
    }
}
