/** The qty counters a WO or a WO line shares. */
export type QtyCounters = {
    planned_qty: number;
    printing_qty: number;
    cutting_qty: number;
    available_qty: number;
    sewing_internal_qty: number;
    sewing_makloon_qty: number;
    hold_qty: number;
    delivered_qty: number;
};

/**
 * Where the pieces are, as one short sentence of only the stages that hold something,
 * e.g. "2 di printing · 4 di gudang". Empty when nothing is in progress.
 */
export function whereabouts(qty: QtyCounters): string {
    return [
        [qty.printing_qty, 'di printing'],
        [qty.cutting_qty, 'di cutting'],
        [qty.available_qty, 'di gudang'],
        [qty.sewing_internal_qty, 'di penjahit'],
        [qty.sewing_makloon_qty, 'di makloon'],
        [qty.hold_qty, 'tunggu revisi'],
    ]
        .filter(([count]) => (count as number) > 0)
        .map(([count, label]) => `${count} ${label}`)
        .join(' · ');
}

/** Share of the planned pieces that are sewn, 0–100. */
export function donePercent(qty: Pick<QtyCounters, 'planned_qty' | 'delivered_qty'>): number {
    return qty.planned_qty > 0 ? Math.min(100, Math.round((qty.delivered_qty / qty.planned_qty) * 100)) : 0;
}
