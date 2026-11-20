import { formatDate } from '@/lib/format';
import type { WorkOrderSummary } from '@/types/sewing';

const pcs = (qty: number) => `${qty.toLocaleString('id-ID')} pcs`;

/**
 * Teks laporan WO untuk grup WhatsApp: judul WO, nama artikel + pcs (tanpa rincian warna/ukuran),
 * total, lalu tautan WO publik sebagai lampiran. *tebal* memakai format WhatsApp.
 */
export function workOrderWaText(workOrder: WorkOrderSummary): string {
    const lines = workOrder.article_lines ?? [];
    const total = lines.reduce((sum, line) => sum + line.qty, 0) || workOrder.planned_qty;

    return [
        `*${workOrder.number}*`,
        ...lines.map((line) => `• ${line.name}: ${pcs(line.qty)}`),
        `Total: *${pcs(total)}*`,
        workOrder.public_url ? `Lampiran WO: ${workOrder.public_url}` : null,
    ]
        .filter(Boolean)
        .join('\n');
}

/** Beberapa WO sekaligus (mis. semua WO berjalan), dipisah baris kosong. */
export function workOrdersWaText(workOrders: WorkOrderSummary[], title: string): string {
    const total = workOrders.reduce((sum, workOrder) => sum + workOrder.planned_qty, 0);
    const today = formatDate(new Date().toISOString().slice(0, 10));

    return [`*${title}* · ${today}`, `${workOrders.length} WO · ${pcs(total)}`, '', workOrders.map(workOrderWaText).join('\n\n')].join('\n');
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
