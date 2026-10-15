import { EmptyState } from '@/components/empty-state';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PayoutTone } from '@/domain/payout/payout-tone';
import { SlipStatement } from '@/domain/payout/slip-statement';
import { formatDateTime, formatIdr, variantLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PayoutSlipLineRecord } from '@/types/sewing';

type SlipLineListProps = {
    lines: PayoutSlipLineRecord[];
    className?: string;
};

/** Every setoran / revisi on a slip: a table on wide screens and paper, stacked rows on phones. */
export function SlipLineList({ lines, className }: SlipLineListProps) {
    if (lines.length === 0) {
        return (
            <EmptyState className={className}>
                <p className="text-base">Tidak ada rincian pekerjaan.</p>
            </EmptyState>
        );
    }

    const total = SlipStatement.linesAmount(lines);

    return (
        <div className={className}>
            <div className="hidden md:block print:block">
                <Table className="text-base">
                    <TableHeader>
                        <TableRow className="bg-muted/60 hover:bg-muted/60">
                            <TableHead className="font-semibold">Tanggal</TableHead>
                            <TableHead className="font-semibold">Jenis</TableHead>
                            <TableHead className="font-semibold">Keterangan</TableHead>
                            <TableHead className="text-right font-semibold">Qty × tarif</TableHead>
                            <TableHead className="text-right font-semibold">Subtotal</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lines.map((line) => (
                            <TableRow key={line.id} className="break-inside-avoid">
                                <TableCell className="align-top tabular">{formatDateTime(line.occurred_at)}</TableCell>
                                <TableCell className="align-top">
                                    <LineTypeBadge line={line} />
                                </TableCell>
                                <TableCell className="align-top whitespace-normal">
                                    <LineDescription line={line} />
                                </TableCell>
                                <TableCell className="text-right align-top tabular">
                                    {line.qty} × {formatIdr(line.rate)}
                                </TableCell>
                                <TableCell className="text-right align-top font-bold tabular">{formatIdr(line.subtotal)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={4} className="font-bold">
                                Jumlah (gaji kotor)
                            </TableCell>
                            <TableCell className="text-right text-lg font-bold tabular">{formatIdr(total)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            <ul className="flex flex-col divide-y md:hidden print:hidden">
                {lines.map((line) => (
                    <li key={line.id} className="flex flex-col gap-2 py-3 first:pt-0">
                        <div className="flex items-start justify-between gap-3">
                            <LineDescription line={line} className="min-w-0" />
                            <p className="shrink-0 text-lg font-bold tabular">{formatIdr(line.subtotal)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <LineTypeBadge line={line} />
                            <span className="text-base font-semibold tabular">
                                {line.qty} pcs × {formatIdr(line.rate)}
                            </span>
                            <span className="text-sm text-muted-foreground tabular">{formatDateTime(line.occurred_at)}</span>
                        </div>
                    </li>
                ))}
                <li className="flex items-center justify-between gap-3 pt-3 pb-0">
                    <span className="font-bold">Jumlah (gaji kotor)</span>
                    <span className="text-lg font-bold tabular">{formatIdr(total)}</span>
                </li>
            </ul>
        </div>
    );
}

export function LineTypeBadge({ line }: { line: Pick<PayoutSlipLineRecord, 'type' | 'type_label'> }) {
    return <ToneBadge tone={PayoutTone.forLineType(line.type)}>{line.type_label}</ToneBadge>;
}

function LineDescription({ line, className }: { line: PayoutSlipLineRecord; className?: string }) {
    const variant = variantLabel(line.color, line.size);

    return (
        <div className={cn('flex flex-col', className)}>
            <span className="font-semibold break-words">{line.description}</span>
            {variant && <span className="text-sm text-muted-foreground">{variant}</span>}
        </div>
    );
}
