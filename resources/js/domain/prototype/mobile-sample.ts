/**
 * Data contoh untuk pratinjau mobile (/pratinjau-mobile). Tidak terhubung ke database:
 * semua perubahan hanya hidup di memori browser dan hilang saat halaman dimuat ulang.
 */

export type SizeQty = Record<string, number>;

export type Holding = {
    id: string;
    article: string;
    wo: string;
    color: string;
    workType: string;
    /** Sisa yang masih dipegang penjahit per ukuran. */
    sizes: SizeQty;
};

export type ProtoTailor = { id: number; name: string; type: 'internal' | 'makloon'; holdings: Holding[] };

export type StockItem = { id: string; article: string; wo: string; color: string; sizes: SizeQty };

export type ProtoWorkOrder = { wo: string; article: string; delivered: number; planned: number; dueInDays: number };

export type ProtoDelivery = { id: number; tailor: string; article: string; color: string; sizes: SizeQty; at: Date; sentToQc: boolean };

export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ALL'];

export const sortSizes = (sizes: string[]) => [...sizes].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));

export const sumSizes = (sizes: SizeQty) => Object.values(sizes).reduce((sum, qty) => sum + qty, 0);

export const holdingTotal = (tailor: ProtoTailor) => tailor.holdings.reduce((sum, holding) => sum + sumSizes(holding.sizes), 0);

const today = new Date();
const at = (hours: number, minutes: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);

export function sampleTailors(): ProtoTailor[] {
    return [
        {
            id: 1,
            name: 'Siti Aminah',
            type: 'internal',
            holdings: [
                { id: 'h1', article: 'Gamis Ayana', wo: 'WO-0241', color: 'Sage', workType: 'Jahit lengkap', sizes: { M: 20, L: 16, XL: 12 } },
                { id: 'h2', article: 'Tunik Livia', wo: 'WO-0244', color: 'Mocca', workType: 'Jahit lengkap', sizes: { S: 8, M: 10 } },
            ],
        },
        {
            id: 2,
            name: 'Rina Wati',
            type: 'internal',
            holdings: [{ id: 'h3', article: 'Tunik Livia', wo: 'WO-0244', color: 'Mocca', workType: 'Jahit lengkap', sizes: { M: 18, L: 18 } }],
        },
        {
            id: 3,
            name: 'Budi Santoso',
            type: 'internal',
            holdings: [
                { id: 'h4', article: 'Kemeja Nara', wo: 'WO-0246', color: 'Putih', workType: 'Jahit lengkap', sizes: { M: 24, L: 24 } },
                { id: 'h5', article: 'Gamis Ayana', wo: 'WO-0241', color: 'Sage', workType: 'Jahit lengkap', sizes: { L: 12 } },
                { id: 'h6', article: 'Tunik Livia', wo: 'WO-0244', color: 'Mocca', workType: 'Jahit lengkap', sizes: { XL: 12 } },
            ],
        },
        { id: 4, name: 'Dewi Lestari', type: 'internal', holdings: [] },
        {
            id: 5,
            name: 'Konveksi Berkah',
            type: 'makloon',
            holdings: [{ id: 'h7', article: 'Kemeja Nara', wo: 'WO-0246', color: 'Putih', workType: 'Makloon', sizes: { L: 30, XL: 30 } }],
        },
    ];
}

export function sampleStock(): StockItem[] {
    return [
        { id: 's1', article: 'Gamis Ayana', wo: 'WO-0241', color: 'Sage', sizes: { M: 30, L: 30, XL: 20 } },
        { id: 's2', article: 'Tunik Livia', wo: 'WO-0244', color: 'Mocca', sizes: { S: 40, M: 40, L: 40 } },
        { id: 's3', article: 'Kemeja Nara', wo: 'WO-0246', color: 'Putih', sizes: { M: 52, L: 52, XL: 52 } },
    ];
}

export function sampleWorkOrders(): ProtoWorkOrder[] {
    return [
        { wo: 'WO-0241', article: 'Gamis Ayana', delivered: 96, planned: 120, dueInDays: -2 },
        { wo: 'WO-0238', article: 'Abaya Kayla', delivered: 40, planned: 90, dueInDays: -1 },
        { wo: 'WO-0244', article: 'Tunik Livia', delivered: 48, planned: 100, dueInDays: 0 },
        { wo: 'WO-0246', article: 'Kemeja Nara', delivered: 24, planned: 80, dueInDays: 3 },
        { wo: 'WO-0247', article: 'Rok Alma', delivered: 0, planned: 60, dueInDays: 6 },
        { wo: 'WO-0230', article: 'Khimar Rania', delivered: 70, planned: 70, dueInDays: -5 },
    ];
}

export function sampleDeliveries(): ProtoDelivery[] {
    return [
        { id: 4, tailor: 'Siti Aminah', article: 'Gamis Ayana', color: 'Sage', sizes: { M: 12, L: 12 }, at: at(9, 41), sentToQc: false },
        { id: 3, tailor: 'Rina Wati', article: 'Tunik Livia', color: 'Mocca', sizes: { M: 16, L: 16 }, at: at(9, 15), sentToQc: false },
        { id: 2, tailor: 'Budi Santoso', article: 'Kemeja Nara', color: 'Putih', sizes: { M: 24, L: 24 }, at: at(8, 52), sentToQc: true },
        { id: 1, tailor: 'Siti Aminah', article: 'Gamis Ayana', color: 'Sage', sizes: { M: 12, XL: 12 }, at: at(8, 30), sentToQc: true },
    ];
}

export const formatTime = (date: Date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export const formatToday = () => today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

export const formatShortDate = (date: Date) => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

export function dueLabel(days: number): { text: string; tone: 'late' | 'today' | 'normal' } {
    if (days < 0) return { text: `Terlambat ${-days} hari`, tone: 'late' };
    if (days === 0) return { text: 'Tenggat hari ini', tone: 'today' };
    const due = new Date(today);
    due.setDate(due.getDate() + days);
    return { text: `Tenggat ${formatShortDate(due)}`, tone: 'normal' };
}

export const sizesLabel = (sizes: SizeQty) =>
    sortSizes(Object.keys(sizes))
        .filter((size) => sizes[size] > 0)
        .map((size) => `${size}: ${sizes[size]} pcs`)
        .join(' · ');
