import type { DeliveryRecord } from '@/types/sewing';

export type QcShipmentPayload = { delivery_ids: number[]; notes: string | null };

/** Deliveries ticked for the next QC shipment. Immutable: every change returns a new selection. */
export class DeliverySelection {
    private constructor(private readonly chosen: ReadonlySet<number>) {}

    static none(): DeliverySelection {
        return new DeliverySelection(new Set());
    }

    has(id: number): boolean {
        return this.chosen.has(id);
    }

    get count(): number {
        return this.chosen.size;
    }

    get isEmpty(): boolean {
        return this.chosen.size === 0;
    }

    get ids(): number[] {
        return [...this.chosen];
    }

    toggle(id: number): DeliverySelection {
        return this.withMany([id], !this.chosen.has(id));
    }

    withMany(ids: number[], selected: boolean): DeliverySelection {
        const next = new Set(this.chosen);

        for (const id of ids) {
            if (selected) next.add(id);
            else next.delete(id);
        }

        return new DeliverySelection(next);
    }

    /** True when every one of the ids is ticked (and there is at least one). */
    covers(ids: number[]): boolean {
        return ids.length > 0 && ids.every((id) => this.chosen.has(id));
    }

    qtyIn(deliveries: DeliveryRecord[]): number {
        return deliveries.reduce((total, delivery) => total + (this.chosen.has(delivery.id) ? delivery.qty : 0), 0);
    }

    /** Forgets ticks for deliveries that are no longer on offer (e.g. shipped from another phone). */
    keepOnly(deliveries: DeliveryRecord[]): DeliverySelection {
        const offered = new Set(deliveries.map((delivery) => delivery.id));
        const kept = this.ids.filter((id) => offered.has(id));

        return kept.length === this.chosen.size ? this : new DeliverySelection(new Set(kept));
    }

    toPayload(notes: string): QcShipmentPayload {
        return { delivery_ids: this.ids, notes: notes.trim() || null };
    }
}
