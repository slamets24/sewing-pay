import { ConfirmButton } from '@/components/confirm-button';
import { EmptyState } from '@/components/empty-state';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { formatDateTime, variantLabel } from '@/lib/format';
import { floorActions } from '@/services/floor-actions';
import type { DeliveryRecord } from '@/types/sewing';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

/**
 * Latest "setor" entries; mistakes can be undone until the goods go to QC or get paid.
 * Shows `limit` rows first, the rest behind "Lihat semua".
 */
export function DeliveryList({ deliveries, undoable = false, limit }: { deliveries: DeliveryRecord[]; undoable?: boolean; limit?: number }) {
    const [expanded, setExpanded] = useState(false);

    if (deliveries.length === 0) return <EmptyState>Belum ada setoran.</EmptyState>;

    const shown = limit && !expanded ? deliveries.slice(0, limit) : deliveries;

    return (
        <>
            <ul className="divide-y">
                {shown.map((delivery) => (
                    <li key={delivery.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-bold">
                                {delivery.tailor_name} · {delivery.qty} pcs {delivery.article_name}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                                {[variantLabel(delivery.color, delivery.size), delivery.work_order_number, formatDateTime(delivery.delivered_at)].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                            {delivery.tailor_type === 'makloon' && <ToneBadge tone="qc">Makloon</ToneBadge>}
                            {delivery.qc_shipment_number ? (
                                <ToneBadge tone="shipped">QC {delivery.qc_shipment_number}</ToneBadge>
                            ) : (
                                <ToneBadge tone="neutral">Belum QC</ToneBadge>
                            )}
                            {undoable && delivery.can_undo && (
                                <ConfirmButton size="sm" variant="ghost" confirmLabel="Ya, batalkan" onConfirm={() => floorActions.send('delete', route('deliveries.destroy', delivery.id))}>
                                    Batalkan
                                </ConfirmButton>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
            {limit && deliveries.length > limit && (
                <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setExpanded(!expanded)}>
                    <ChevronDown className={expanded ? 'rotate-180' : undefined} />
                    {expanded ? 'Tampilkan lebih sedikit' : `Lihat semua (${deliveries.length})`}
                </Button>
            )}
        </>
    );
}
