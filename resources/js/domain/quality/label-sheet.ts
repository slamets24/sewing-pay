import type { DeliveryRecord, QcShipmentRecord } from '@/types/sewing';

export type LabelSize = 'a4' | 'thermal';

/** One sticker for one sewn piece. */
export type PieceLabel = {
    key: string;
    barcode: string | null;
    brandName: string | null;
    articleName: string;
    variant: string;
    tailorCode: string | null;
    tailorName: string;
    workOrderNumber: string;
    shipmentNumber: string;
    piece: number;
    of: number;
};

/** Label stock the admin can print on. */
export type LabelSizeOption = { value: LabelSize; label: string; hint: string; perPage: number };

/** Expands a QC shipment into one barcode label per piece, plus the numbers for the cover sheet. */
export class LabelSheet {
    static readonly sizes: LabelSizeOption[] = [
        { value: 'a4', label: 'A4 · 3 kolom', hint: 'Kertas A4 biasa, 21 label per halaman. Halaman pertama berisi ringkasan kiriman.', perPage: 21 },
        { value: 'thermal', label: 'Thermal 50×30 mm', hint: 'Printer label thermal, 1 label per lembar. Ringkasan tidak ikut dicetak.', perPage: 1 },
    ];

    readonly labels: PieceLabel[];

    private constructor(
        readonly shipment: QcShipmentRecord,
        readonly deliveries: DeliveryRecord[],
    ) {
        this.labels = deliveries.flatMap((delivery) => LabelSheet.expand(delivery, shipment.number));
    }

    static for(shipment: QcShipmentRecord, deliveries: DeliveryRecord[]): LabelSheet {
        return new LabelSheet(shipment, deliveries);
    }

    static size(value: LabelSize): LabelSizeOption {
        return LabelSheet.sizes.find((option) => option.value === value) ?? LabelSheet.sizes[0];
    }

    get totalPcs(): number {
        return this.deliveries.reduce((total, delivery) => total + delivery.qty, 0);
    }

    /** Deliveries whose variant has no packing barcode yet; their labels print a blank box. */
    get withoutBarcode(): DeliveryRecord[] {
        return this.deliveries.filter((delivery) => !delivery.barcode_value);
    }

    get missingBarcodePcs(): number {
        return this.withoutBarcode.reduce((total, delivery) => total + delivery.qty, 0);
    }

    /** Sheets of paper (A4 pages incl. the cover sheet) or stickers the print run uses. */
    sheetCount(size: LabelSize): number {
        if (size === 'thermal') return this.labels.length;

        return 1 + Math.ceil(this.labels.length / LabelSheet.size('a4').perPage);
    }

    static tailorLabel(delivery: Pick<DeliveryRecord, 'tailor_code' | 'tailor_name'>): string {
        return delivery.tailor_code ? `${delivery.tailor_code} · ${delivery.tailor_name}` : delivery.tailor_name;
    }

    private static expand(delivery: DeliveryRecord, shipmentNumber: string): PieceLabel[] {
        const variantParts = [delivery.color, delivery.size].filter(Boolean);
        const variant = variantParts.join(' | ');

        return Array.from({ length: Math.max(0, delivery.qty) }, (_, index) => ({
            key: `${delivery.id}-${index + 1}`,
            barcode: delivery.barcode_value,
            brandName: delivery.brand_name || 'AZZAHRA',
            articleName: delivery.article_name,
            variant,
            tailorCode: delivery.tailor_code,
            tailorName: delivery.tailor_name,
            workOrderNumber: delivery.work_order_number,
            shipmentNumber,
            piece: index + 1,
            of: delivery.qty,
        }));
    }
}
