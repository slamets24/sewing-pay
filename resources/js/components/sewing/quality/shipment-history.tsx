import { EmptyState } from '@/components/empty-state';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import type { QcShipmentRecord } from '@/types/sewing';
import { Link } from '@inertiajs/react';
import { Printer } from 'lucide-react';

/** Past hand-overs to QC (the goods leave this division here), with a way to reprint their labels. */
export function ShipmentHistory({ shipments }: { shipments: QcShipmentRecord[] }) {
    if (shipments.length === 0) {
        return <EmptyState>Belum ada kiriman ke QC.</EmptyState>;
    }

    return (
        <ul className="divide-y">
            {shipments.map((shipment) => {
                return (
                    <li key={shipment.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1 basis-48">
                            <p className="font-display text-xl font-bold">{shipment.number}</p>
                            <p className="text-sm text-muted-foreground">
                                {formatDateTime(shipment.sent_at)}
                                {shipment.created_by_name && ` · ${shipment.created_by_name}`}
                            </p>
                            {shipment.notes && <p className="text-sm">{shipment.notes}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-lg font-bold tabular">{shipment.qty} pcs</span>
                            <ToneBadge tone="qc">{shipment.deliveries_count} setoran</ToneBadge>
                        </div>
                        <Button asChild variant="outline">
                            <Link href={route('qc-shipments.labels', shipment.id)}>
                                <Printer aria-hidden />
                                Cetak label
                            </Link>
                        </Button>
                    </li>
                );
            })}
        </ul>
    );
}
