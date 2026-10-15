import { variantLabel } from '@/lib/format';
import type { DeliveryRecord, PickupItemRecord, RevisionType } from '@/types/sewing';

/** Where the problem was found: reported back by QC (another division), or spotted while still sewing. */
export type RevisionSource = 'qc' | 'sewing';

export type RevisionReportPayload = {
    type: RevisionType;
    found_at: RevisionSource;
    sewing_delivery_id: number | null;
    pickup_item_id: number | null;
    return_to_warehouse: boolean;
    work_order_item_id: number | null;
    revision_part_id: number | null;
    tailor_id: number | null;
    qty: number;
    notes: string | null;
};

/** The goods a revision is about, from either source, in one shape the form can show and send. */
export class RevisionTarget {
    private constructor(
        readonly key: string,
        readonly source: RevisionSource,
        readonly tailorId: number,
        readonly tailorName: string,
        readonly title: string,
        readonly detail: string,
        readonly maxQty: number,
        readonly workOrderItemId: number,
        readonly deliveryId: number | null,
        readonly pickupItemId: number | null,
    ) {}

    static fromDelivery(delivery: DeliveryRecord): RevisionTarget {
        return new RevisionTarget(
            `d${delivery.id}`,
            'qc',
            delivery.tailor_id,
            delivery.tailor_name,
            [delivery.article_name, variantLabel(delivery.color, delivery.size)].filter(Boolean).join(' · '),
            `WO ${delivery.work_order_number} · ${delivery.qc_shipment_number ?? 'kiriman QC'} · ${delivery.tailor_name} · ${delivery.qty} pcs`,
            Math.max(1, delivery.qty),
            delivery.work_order_item_id,
            delivery.id,
            null,
        );
    }

    static fromPickupItem(item: PickupItemRecord): RevisionTarget {
        return new RevisionTarget(
            `p${item.id}`,
            'sewing',
            item.tailor_id,
            item.tailor_name,
            [item.article_name, variantLabel(item.color, item.size)].filter(Boolean).join(' · '),
            `WO ${item.work_order_number} · ${item.tailor_name} · masih dijahit ${item.remaining_qty} dari ${item.qty} pcs`,
            Math.max(1, item.remaining_qty || item.qty),
            item.work_order_item_id,
            null,
            item.id,
        );
    }
}

const clamp = (value: number, min: number, max: number) => (Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : min);

/**
 * "Catat revisi" form state. Picking the goods fills in their tailor; material fixes also need the replaced part.
 * Switching the source clears the picked goods because the two lists are different. Immutable.
 */
export class RevisionReportDraft {
    private constructor(
        readonly source: RevisionSource,
        readonly type: RevisionType,
        readonly target: RevisionTarget | null,
        readonly partId: number | null,
        readonly tailorId: number | null,
        readonly qty: number,
        readonly notes: string,
        readonly returnToWarehouse: boolean = false,
    ) {}

    static start(type: RevisionType = 'material', source: RevisionSource = 'qc'): RevisionReportDraft {
        return new RevisionReportDraft(source, type, null, null, null, 1, '');
    }

    /** Opened from a tailor's line on the "Setor" page: material defect on that exact item. */
    static forPickupItem(item: PickupItemRecord): RevisionReportDraft {
        return RevisionReportDraft.start('material', 'sewing').withTarget(RevisionTarget.fromPickupItem(item));
    }

    /** Only a material defect on goods still being sewn can be handed back to the warehouse. */
    get canReturnToWarehouse(): boolean {
        return this.source === 'sewing' && this.isMaterial;
    }

    withReturnToWarehouse(returnToWarehouse: boolean): RevisionReportDraft {
        return this.copy({ returnToWarehouse });
    }

    private copy(changes: Partial<Pick<RevisionReportDraft, 'returnToWarehouse'>>): RevisionReportDraft {
        return new RevisionReportDraft(this.source, this.type, this.target, this.partId, this.tailorId, this.qty, this.notes, changes.returnToWarehouse ?? this.returnToWarehouse);
    }

    get isMaterial(): boolean {
        return this.type === 'material';
    }

    get maxQty(): number {
        return this.target?.maxQty ?? 1;
    }

    withSource(source: RevisionSource): RevisionReportDraft {
        return source === this.source ? this : new RevisionReportDraft(source, this.type, null, this.partId, null, 1, this.notes, false);
    }

    withType(type: RevisionType): RevisionReportDraft {
        return new RevisionReportDraft(this.source, type, this.target, this.partId, this.tailorId, this.qty, this.notes, type === 'material' && this.returnToWarehouse);
    }

    withTarget(target: RevisionTarget | null): RevisionReportDraft {
        return new RevisionReportDraft(this.source, this.type, target, this.partId, target?.tailorId ?? null, this.qty, this.notes, this.returnToWarehouse).withQty(this.qty);
    }

    withPart(partId: number | null): RevisionReportDraft {
        return new RevisionReportDraft(this.source, this.type, this.target, partId, this.tailorId, this.qty, this.notes, this.returnToWarehouse);
    }

    withTailor(tailorId: number | null): RevisionReportDraft {
        return new RevisionReportDraft(this.source, this.type, this.target, this.partId, tailorId, this.qty, this.notes, this.returnToWarehouse);
    }

    withQty(qty: number): RevisionReportDraft {
        return new RevisionReportDraft(this.source, this.type, this.target, this.partId, this.tailorId, clamp(qty, 1, this.maxQty), this.notes, this.returnToWarehouse);
    }

    withNotes(notes: string): RevisionReportDraft {
        return new RevisionReportDraft(this.source, this.type, this.target, this.partId, this.tailorId, this.qty, notes, this.returnToWarehouse);
    }

    /** Plain-language reason the save button is still disabled, or null when the form can be sent. */
    get blocker(): string | null {
        if (!this.target) return this.source === 'qc' ? 'Pilih barang yang dilaporkan QC.' : 'Pilih barang yang direvisi.';
        if (this.isMaterial && this.partId === null) return 'Pilih bagian yang diganti.';
        if (this.tailorId === null) return 'Pilih penjahit yang mengerjakan revisi.';

        return null;
    }

    get canSubmit(): boolean {
        return this.blocker === null;
    }

    toPayload(): RevisionReportPayload {
        return {
            type: this.type,
            found_at: this.source,
            sewing_delivery_id: this.target?.deliveryId ?? null,
            pickup_item_id: this.target?.pickupItemId ?? null,
            return_to_warehouse: this.canReturnToWarehouse && this.returnToWarehouse,
            work_order_item_id: this.target?.workOrderItemId ?? null,
            revision_part_id: this.isMaterial ? this.partId : null,
            tailor_id: this.tailorId,
            qty: this.qty,
            notes: this.notes.trim() || null,
        };
    }
}
