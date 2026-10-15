import { ConfirmButton } from '@/components/confirm-button';
import { EmptyState } from '@/components/empty-state';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { formatDateTime, formatIdr, variantLabel } from '@/lib/format';
import { floorActions } from '@/services/floor-actions';
import type { DeliveryRecord } from '@/types/sewing';

/** Latest "setor" entries; mistakes can be undone until the goods go to QC or onto a pay slip. */
export function DeliveryList({ deliveries, undoable = false }: { deliveries: DeliveryRecord[]; undoable?: boolean }) {
    if (deliveries.length === 0) return <EmptyState>Belum ada setoran.</EmptyState>;

    return (
        <ul className="divide-y">
            {deliveries.map((delivery) => (
                <li key={delivery.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-bold">
                            {delivery.tailor_name} · {delivery.qty} pcs {delivery.article_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {[variantLabel(delivery.color, delivery.size), delivery.work_order_number, formatDateTime(delivery.delivered_at)].filter(Boolean).join(' · ')}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {delivery.qc_shipment_number ? (
                                <ToneBadge tone="qc">QC {delivery.qc_shipment_number}</ToneBadge>
                            ) : (
                                <ToneBadge tone="neutral">Belum dikirim QC</ToneBadge>
                            )}
                            {delivery.is_payable ? (
                                <ToneBadge tone="done">{formatIdr(delivery.subtotal)}</ToneBadge>
                            ) : (
                                <ToneBadge tone="other">Makloon</ToneBadge>
                            )}
                        </div>
                    </div>
                    {undoable && delivery.can_undo && (
                        <ConfirmButton size="sm" confirmLabel="Ya, batalkan" onConfirm={() => floorActions.send('delete', route('deliveries.destroy', delivery.id))}>
                            Batalkan
                        </ConfirmButton>
                    )}
                </li>
            ))}
        </ul>
    );
}
