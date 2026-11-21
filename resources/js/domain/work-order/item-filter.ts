import type { WorkOrderItemRecord } from '@/types/sewing';

export type ItemStageFilter = 'all' | 'print' | 'cut' | 'vendor' | 'gudang' | 'jahit';

const STAGES: { value: ItemStageFilter; label: string; test: (item: WorkOrderItemRecord) => boolean }[] = [
    { value: 'all', label: 'Semua', test: () => true },
    { value: 'print', label: 'Printing', test: (item) => !item.is_polosan && item.printing_qty > 0 },
    { value: 'cut', label: 'Cutting', test: (item) => item.cutting_qty > 0 },
    { value: 'vendor', label: 'Vendor', test: (item) => (item.vendor_waiting_qty ?? 0) > 0 || (item.vendor_qty ?? 0) > 0 },
    { value: 'gudang', label: 'Gudang', test: (item) => item.available_qty > 0 },
    { value: 'jahit', label: 'Penjahit', test: (item) => item.sewing_qty > 0 },
];

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Narrows the article lines of one WO by free text (every word must match name, colour, size or barcode,
 * in any order: "aviri brown xl") and by the stage the pieces are in.
 */
export class WorkOrderItemFilter {
    constructor(
        readonly query: string = '',
        readonly stage: ItemStageFilter = 'all',
    ) {}

    withQuery(query: string): WorkOrderItemFilter {
        return new WorkOrderItemFilter(query, this.stage);
    }

    withStage(stage: ItemStageFilter): WorkOrderItemFilter {
        return new WorkOrderItemFilter(this.query, stage);
    }

    get isActive(): boolean {
        return normalize(this.query) !== '' || this.stage !== 'all';
    }

    apply(items: WorkOrderItemRecord[]): WorkOrderItemRecord[] {
        const stage = STAGES.find((option) => option.value === this.stage) ?? STAGES[0];

        return items.filter((item) => stage.test(item) && WorkOrderItemFilter.matchesText(item, this.query));
    }

    /** Stage chips with how many lines the current text would leave in each; empty stages are hidden. */
    stageOptions(items: WorkOrderItemRecord[]): { value: ItemStageFilter; label: string; count: number }[] {
        const byText = items.filter((item) => WorkOrderItemFilter.matchesText(item, this.query));

        return STAGES.map((option) => ({ value: option.value, label: option.label, count: byText.filter(option.test).length })).filter(
            (option) => option.value === 'all' || option.count > 0 || option.value === this.stage,
        );
    }

    static matchesText(item: WorkOrderItemRecord, query: string): boolean {
        const words = normalize(query).split(' ').filter(Boolean);
        if (words.length === 0) return true;

        const haystack = normalize([item.article_name, item.color, item.size, item.barcode_value, item.is_polosan ? 'polosan' : ''].filter(Boolean).join(' '));

        return words.every((word) => haystack.includes(word));
    }
}
