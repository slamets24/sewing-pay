import { formatDate } from '@/lib/format';
import type { WorkOrderSummary } from '@/types/sewing';

const pcs = (qty: number) => `${qty.toLocaleString('id-ID')} pcs`;

type Line = NonNullable<WorkOrderSummary['article_lines']>[number];

const section = (title: string, lines: Line[], pick: (line: Line) => number) => {
    const rows = lines.filter((line) => pick(line) > 0);
    return rows.length === 0 ? [] : [`${title}:`, ...rows.map((line) => `• ${line.name}: ${pcs(pick(line))}`)];
};

export const warehouseTotal = (workOrder: WorkOrderSummary) => (workOrder.article_lines ?? []).reduce((sum, line) => sum + line.warehouse_qty, 0);
export const sewingTotal = (workOrder: WorkOrderSummary) => (workOrder.article_lines ?? []).reduce((sum, line) => sum + line.sewing_qty, 0);

/**
 * Laporan satu WO untuk grup WhatsApp: hanya barang yang ada di gudang dan yang sedang di penjahit,
 * per nama artikel (tanpa rincian warna/ukuran). *tebal* memakai format WhatsApp.
 */
export function workOrderWaText(workOrder: WorkOrderSummary): string {
    const lines = workOrder.article_lines ?? [];
    const body = [...section('Di gudang', lines, (line) => line.warehouse_qty), ...section('Di penjahit', lines, (line) => line.sewing_qty)];

    return [`*${workOrder.number}*`, ...(body.length > 0 ? body : ['Tidak ada barang di gudang maupun di penjahit.'])].join('\n');
}

/** Beberapa WO sekaligus; WO yang tidak punya barang di gudang/penjahit dilewati. */
export function workOrdersWaText(workOrders: WorkOrderSummary[], title: string): string {
    const shown = workOrders.filter((workOrder) => warehouseTotal(workOrder) + sewingTotal(workOrder) > 0);
    const gudang = shown.reduce((sum, workOrder) => sum + warehouseTotal(workOrder), 0);
    const penjahit = shown.reduce((sum, workOrder) => sum + sewingTotal(workOrder), 0);
    const today = formatDate(new Date().toISOString().slice(0, 10));

    return [
        `*${title}* · ${today}`,
        `Di gudang ${pcs(gudang)} · Di penjahit ${pcs(penjahit)}`,
        '',
        shown.length > 0 ? shown.map(workOrderWaText).join('\n\n') : 'Tidak ada barang di gudang maupun di penjahit.',
    ].join('\n');
}

/** Salin ke papan klip; ada cadangan untuk browser yang dibuka lewat http (bukan https), mis. IP lokal. */
export async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // lanjut ke cara lama
    }

    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch {
        ok = false;
    }
    document.body.removeChild(area);
    return ok;
}

export const whatsappShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
