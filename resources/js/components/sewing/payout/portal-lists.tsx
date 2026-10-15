import { EmptyState } from '@/components/empty-state';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { PayoutTone } from '@/domain/payout/payout-tone';
import { TailorPortal } from '@/domain/payout/tailor-portal';
import { formatDate, formatDateTime, formatIdr, variantLabel } from '@/lib/format';
import { ToneStyle } from '@/lib/tone';
import { cn } from '@/lib/utils';
import type { DeliveryRecord, PayoutSlipRecord, PickupItemRecord, RevisionRecord } from '@/types/sewing';
import { FileText, PackageCheck, Receipt, Shirt, Wrench, type LucideIcon } from 'lucide-react';

export type PortalSlip = PayoutSlipRecord & { cutoff_date: string };

/** Goods the tailor is holding right now, with how many are left and the WO deadline. */
export function HoldingList({ items }: { items: PickupItemRecord[] }) {
    if (items.length === 0) return <Empty icon={Shirt}>Tidak ada barang yang sedang dipegang.</Empty>;

    return (
        <ul className="flex flex-col gap-3">
            {items.map((item) => {
                const due = TailorPortal.dueBadge(item.due_at);

                return (
                    <li key={item.id} className="flex flex-col gap-3 rounded-lg border border-l-4 border-l-stage-sewing p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-col gap-1">
                            <ItemTitle name={item.article_name} color={item.color} size={item.size} />
                            <p className="text-sm text-muted-foreground">
                                WO {item.work_order_number} · diambil {formatDateTime(item.picked_at)}
                            </p>
                            {due && <ToneBadge tone={due.tone}>{due.label}</ToneBadge>}
                        </div>
                        <QtyFigure label="Sisa" qty={item.remaining_qty} total={item.qty} />
                    </li>
                );
            })}
        </ul>
    );
}

/** Revisions assigned to the tailor that are not finished yet. */
export function RevisionList({ revisions }: { revisions: RevisionRecord[] }) {
    if (revisions.length === 0) return <Empty icon={Wrench}>Tidak ada revisi yang perlu dikerjakan.</Empty>;

    return (
        <ul className="flex flex-col gap-3">
            {revisions.map((revision) => (
                <li key={revision.id} className="flex flex-col gap-3 rounded-lg border border-l-4 border-l-stage-revision p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <ToneBadge tone="neutral">{revision.type_label}</ToneBadge>
                            <ToneBadge tone={ToneStyle.forRevisionStatus(revision.status)}>{revision.status_label}</ToneBadge>
                        </div>
                        <ItemTitle name={revision.article_name} color={revision.color} size={revision.size} />
                        {revision.part_name && (
                            <p className="text-base">
                                Bagian: <span className="font-semibold">{revision.part_name}</span>
                                {revision.material_type && <span className="text-muted-foreground"> ({revision.material_type})</span>}
                            </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                            WO {revision.work_order_number} · dilaporkan {formatDateTime(revision.reported_at)}
                        </p>
                        {revision.notes && <p className="text-sm text-muted-foreground italic">{revision.notes}</p>}
                    </div>
                    <QtyFigure label="Jumlah" qty={revision.qty} />
                </li>
            ))}
        </ul>
    );
}

/** Latest sewing deliveries; the money column only for tailors paid through slips. */
export function DeliveryList({ deliveries, showMoney }: { deliveries: DeliveryRecord[]; showMoney: boolean }) {
    if (deliveries.length === 0) return <Empty icon={PackageCheck}>Belum ada setoran.</Empty>;

    return (
        <ul className="flex flex-col divide-y">
            {deliveries.map((delivery) => (
                <li key={delivery.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <ItemTitle name={delivery.article_name} color={delivery.color} size={delivery.size} compact />
                        <p className="text-sm text-muted-foreground">
                            {formatDateTime(delivery.delivered_at)} · WO {delivery.work_order_number}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                        <span className="text-xl font-bold tabular">{delivery.qty} pcs</span>
                        {showMoney && delivery.is_payable && <span className="text-base font-semibold text-muted-foreground tabular">{formatIdr(delivery.subtotal)}</span>}
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** The tailor's pay slips, each opening the public slip page. */
export function PortalSlipList({ slips }: { slips: PortalSlip[] }) {
    if (slips.length === 0) return <Empty icon={Receipt}>Belum ada slip gaji.</Empty>;

    return (
        <ul className="flex flex-col gap-3">
            {slips.map((slip) => (
                <li
                    key={slip.id}
                    className={cn('flex flex-col gap-3 rounded-lg border border-t-4 p-3 sm:flex-row sm:items-center sm:justify-between', ToneStyle.topBorder(PayoutTone.forStatus(slip.status)))}
                >
                    <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-bold break-all">{slip.invoice_number}</span>
                            <ToneBadge tone={PayoutTone.forStatus(slip.status)}>{slip.status_label}</ToneBadge>
                        </div>
                        <p className="text-base text-muted-foreground">s.d. {formatDate(slip.cutoff_date)}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                        <span className="font-display text-3xl leading-none font-bold tabular">{formatIdr(slip.net_amount)}</span>
                        <Button asChild variant="outline">
                            <a href={slip.public_url}>
                                <FileText />
                                Buka slip
                            </a>
                        </Button>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function ItemTitle({ name, color, size, compact = false }: { name: string; color: string | null; size: string | null; compact?: boolean }) {
    const variant = variantLabel(color, size);

    return (
        <div className="flex flex-col">
            <span className={cn('font-bold break-words', compact ? 'text-base' : 'text-lg')}>{name}</span>
            {variant && <span className="text-base text-muted-foreground">{variant}</span>}
        </div>
    );
}

function QtyFigure({ label, qty, total }: { label: string; qty: number; total?: number }) {
    return (
        <div className="flex shrink-0 items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0">
            <span className="text-sm font-semibold text-muted-foreground uppercase">{label}</span>
            <span className="font-display text-3xl leading-none font-bold tabular">
                {qty}
                <span className="font-sans text-lg font-semibold text-muted-foreground">{total !== undefined ? ` / ${total} pcs` : ' pcs'}</span>
            </span>
        </div>
    );
}

function Empty({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
    return (
        <EmptyState>
            <Icon className="size-8" aria-hidden />
            <p className="text-base">{children}</p>
        </EmptyState>
    );
}
