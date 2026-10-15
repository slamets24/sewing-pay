import type { TailorRecord, WorkOrderItemRecord } from '@/types/sewing';

export type CartLine = { item: WorkOrderItemRecord; qty: number };

/** Immutable "who takes what" selection for one warehouse pickup. Lines may come from different work orders. */
export class PickupCart {
    private constructor(
        readonly tailor: TailorRecord | null,
        readonly lines: CartLine[],
        readonly pickedAt: string,
        readonly notes: string,
    ) {}

    static start(tailor: TailorRecord | null = null): PickupCart {
        return new PickupCart(tailor, [], '', '');
    }

    withTailor(tailor: TailorRecord | null): PickupCart {
        return new PickupCart(tailor, this.lines, this.pickedAt, this.notes);
    }

    withPickedAt(pickedAt: string): PickupCart {
        return new PickupCart(this.tailor, this.lines, pickedAt, this.notes);
    }

    withNotes(notes: string): PickupCart {
        return new PickupCart(this.tailor, this.lines, this.pickedAt, notes);
    }

    qtyOf(itemId: number): number {
        return this.lines.find((line) => line.item.id === itemId)?.qty ?? 0;
    }

    /** Sets how many pieces of a line are taken; 0 removes it. Never more than what is in the warehouse. */
    withQty(item: WorkOrderItemRecord, qty: number): PickupCart {
        const clamped = Math.min(Math.max(0, Math.round(qty)), item.available_qty);
        const others = this.lines.filter((line) => line.item.id !== item.id);
        const lines = clamped > 0 ? [...others, { item, qty: clamped }] : others;

        return new PickupCart(this.tailor, lines, this.pickedAt, this.notes);
    }

    /** Drops lines whose stock was taken by someone else meanwhile, and clamps the rest to fresh stock. */
    syncWith(items: WorkOrderItemRecord[]): PickupCart {
        let cart = new PickupCart(this.tailor, [], this.pickedAt, this.notes);

        for (const line of this.lines) {
            const fresh = items.find((item) => item.id === line.item.id);

            if (fresh) cart = cart.withQty(fresh, line.qty);
        }

        return cart;
    }

    get totalQty(): number {
        return this.lines.reduce((sum, line) => sum + line.qty, 0);
    }

    get isMakloon(): boolean {
        return this.tailor?.type === 'makloon';
    }

    /** Expected pay at today's article rates; makloon work is not paid here. */
    get estimatedWage(): number {
        return this.isMakloon ? 0 : this.lines.reduce((sum, line) => sum + line.qty * line.item.sewing_rate, 0);
    }

    get isReady(): boolean {
        return this.tailor !== null && this.lines.length > 0;
    }

    toPayload(): { tailor_id: number | null; picked_at: string | null; notes: string | null; items: { work_order_item_id: number; qty: number }[] } {
        return {
            tailor_id: this.tailor?.id ?? null,
            picked_at: this.pickedAt || null,
            notes: this.notes.trim() || null,
            items: this.lines.map((line) => ({ work_order_item_id: line.item.id, qty: line.qty })),
        };
    }
}
