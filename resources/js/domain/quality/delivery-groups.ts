import type { DeliveryRecord } from '@/types/sewing';

export type DeliveryGrouping = 'tailor' | 'work_order' | 'shipment';

/** Deliveries that sit together on screen: the same tailor, the same WO or the same QC shipment. */
export class DeliveryGroup {
    constructor(
        readonly key: string,
        readonly title: string,
        readonly deliveries: DeliveryRecord[],
    ) {}

    get ids(): number[] {
        return this.deliveries.map((delivery) => delivery.id);
    }

    get qty(): number {
        return this.deliveries.reduce((total, delivery) => total + delivery.qty, 0);
    }

    get summary(): string {
        return `${this.deliveries.length} setoran · ${this.qty} pcs`;
    }

    get missingBarcodeCount(): number {
        return this.deliveries.filter((delivery) => !delivery.barcode_value).length;
    }
}

type Bucket = { title: string; deliveries: DeliveryRecord[] };

/** Splits a flat delivery list into groups, keeping the server's order inside each group. */
export class DeliveryGroups {
    static readonly pickOptions: { value: Exclude<DeliveryGrouping, 'shipment'>; label: string }[] = [
        { value: 'tailor', label: 'Per penjahit' },
        { value: 'work_order', label: 'Per WO' },
    ];

    static by(deliveries: DeliveryRecord[], grouping: DeliveryGrouping): DeliveryGroup[] {
        const buckets = new Map<string, Bucket>();

        for (const delivery of deliveries) {
            const key = DeliveryGroups.keyOf(delivery, grouping);
            const bucket = buckets.get(key) ?? { title: DeliveryGroups.titleOf(delivery, grouping), deliveries: [] };

            bucket.deliveries.push(delivery);
            buckets.set(key, bucket);
        }

        const groups = [...buckets.entries()].map(([key, bucket]) => new DeliveryGroup(key, bucket.title, bucket.deliveries));

        // Shipments stay oldest first (the order QC should work in); people and WOs read best alphabetically.
        return grouping === 'shipment' ? groups : groups.sort((a, b) => a.title.localeCompare(b.title, 'id', { numeric: true }));
    }

    static tailorLabel(delivery: Pick<DeliveryRecord, 'tailor_code' | 'tailor_name'>): string {
        return delivery.tailor_code ? `${delivery.tailor_name} (${delivery.tailor_code})` : delivery.tailor_name;
    }

    private static keyOf(delivery: DeliveryRecord, grouping: DeliveryGrouping): string {
        switch (grouping) {
            case 'tailor':
                return `tailor-${delivery.tailor_id}`;
            case 'work_order':
                return `wo-${delivery.work_order_number}`;
            case 'shipment':
                return `shipment-${delivery.qc_shipment_id ?? 0}`;
        }
    }

    private static titleOf(delivery: DeliveryRecord, grouping: DeliveryGrouping): string {
        switch (grouping) {
            case 'tailor':
                return DeliveryGroups.tailorLabel(delivery);
            case 'work_order':
                return `WO ${delivery.work_order_number}`;
            case 'shipment':
                return delivery.qc_shipment_number ? `Kiriman ${delivery.qc_shipment_number}` : 'Tanpa nomor kiriman';
        }
    }
}
