import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatIdr } from '@/lib/format';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Printer,
    Trash2,
} from 'lucide-react';

type LineItem = {
    id: number;
    description: string;
    wo_number: string | null;
    color: string | null;
    size: string | null;
    qty: number;
    rate: number;
    subtotal: number;
    delivered_at: string | null;
};

type PaymentDetail = {
    id: number;
    code: string;
    payment_date: string;
    payment_date_formatted: string;
    paid_at: string | null;
    status: string;
    total_qty: number;
    gross_amount: number;
    adjustment_amount: number;
    net_amount: number;
    payment_method: string | null;
    notes: string | null;
    tailor: {
        id: number;
        name: string;
        code: string;
        whatsapp_number: string | null;
        address: string | null;
    };
    creator: {
        name: string;
    } | null;
    lines: LineItem[];
};

export default function MakloonPaymentShow({ payment }: { payment: PaymentDetail }) {
    const handlePrint = () => {
        window.print();
    };

    const handleDelete = () => {
        if (confirm(`Batalkan pembayaran ${payment.code}? Setoran akan kembali ke daftar belum dibayar.`)) {
            router.delete(route('makloon-payments.destroy', payment.id));
        }
    };

    return (
        <AppLayout title={`Faktur ${payment.code}`}>
            <Head title={`Faktur Maklun - ${payment.code}`} />

            {/* Top Toolbar (Hidden on print) */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
                    <Link href={route('makloon-payments.index')}>
                        <ArrowLeft className="size-4 mr-1" />
                        Semua Pembayaran Maklun
                    </Link>
                </Button>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                        <Printer className="size-4" />
                        Cetak Nota
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        className="text-destructive hover:bg-destructive/10 gap-1.5"
                    >
                        <Trash2 className="size-4" />
                        Batalkan
                    </Button>
                </div>
            </div>

            {/* Printable Invoice Container */}
            <div className="mx-auto max-w-4xl rounded-2xl border bg-card p-6 shadow-xs sm:p-10 print:border-none print:shadow-none print:p-0">
                {/* Header Nota */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                                BUKTI PEMBAYARAN MAKLUN
                            </h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Faktur Resmi Biaya Jahit Borongan Luar
                        </p>
                    </div>

                    <div className="text-left sm:text-right">
                        <span className="font-mono text-lg font-bold text-primary block">
                            {payment.code}
                        </span>
                        <div className="mt-1 flex items-center sm:justify-end gap-2">
                            <ToneBadge tone="ready">LUNAS</ToneBadge>
                            <span className="text-xs text-muted-foreground">
                                {payment.payment_date_formatted}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b text-sm">
                    {/* Info Vendor Maklun */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Dibayarkan Kepada
                        </p>
                        <p className="text-base font-bold text-foreground">{payment.tailor.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">Kode: {payment.tailor.code}</p>
                        {payment.tailor.whatsapp_number && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                WhatsApp: {payment.tailor.whatsapp_number}
                            </p>
                        )}
                        {payment.tailor.address && (
                            <p className="text-xs text-muted-foreground mt-0.5">{payment.tailor.address}</p>
                        )}
                    </div>

                    {/* Info Pembayaran */}
                    <div className="sm:text-right">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Rincian Pembayaran
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                            Metode: <span className="uppercase">{payment.payment_method || 'Transfer'}</span>
                        </p>
                        {payment.creator && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Dicatat oleh: {payment.creator.name}
                            </p>
                        )}
                        {payment.notes && (
                            <p className="text-xs italic text-muted-foreground mt-1">
                                Catatan: "{payment.notes}"
                            </p>
                        )}
                    </div>
                </div>

                {/* Tabel Rincian Jahitan */}
                <div className="py-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                        Rincian Barang yang Disetor & Dibayar
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                                <tr>
                                    <th className="py-2.5 px-3">No.</th>
                                    <th className="py-2.5 px-3">WO</th>
                                    <th className="py-2.5 px-3">Artikel</th>
                                    <th className="py-2.5 px-3">Varian</th>
                                    <th className="py-2.5 px-3">Tgl Setor</th>
                                    <th className="py-2.5 px-3 text-right">Qty</th>
                                    <th className="py-2.5 px-3 text-right">Tarif</th>
                                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {payment.lines.map((line, idx) => (
                                    <tr key={line.id} className="text-xs">
                                        <td className="py-2.5 px-3 text-muted-foreground">{idx + 1}</td>
                                        <td className="py-2.5 px-3 font-mono font-medium">{line.wo_number || '-'}</td>
                                        <td className="py-2.5 px-3 font-semibold text-foreground">{line.description}</td>
                                        <td className="py-2.5 px-3 text-muted-foreground">
                                            {[line.color, line.size].filter(Boolean).join(' - ') || '-'}
                                        </td>
                                        <td className="py-2.5 px-3 text-muted-foreground">{line.delivered_at || '-'}</td>
                                        <td className="py-2.5 px-3 text-right font-semibold tabular">
                                            {line.qty} pcs
                                        </td>
                                        <td className="py-2.5 px-3 text-right tabular text-muted-foreground">
                                            {formatIdr(line.rate)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-bold text-foreground tabular">
                                            {formatIdr(line.subtotal)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Perhitungan Total */}
                <div className="flex flex-col sm:flex-row justify-end border-t pt-4">
                    <div className="w-full sm:w-80 space-y-2 text-sm">
                        <div className="flex justify-between py-1 text-muted-foreground">
                            <span>Total Jumlah Pcs</span>
                            <span className="font-semibold text-foreground tabular">{payment.total_qty} pcs</span>
                        </div>
                        <div className="flex justify-between py-1 text-muted-foreground">
                            <span>Total Tagihan (Gross)</span>
                            <span className="font-semibold text-foreground tabular">{formatIdr(payment.gross_amount)}</span>
                        </div>
                        {payment.adjustment_amount !== 0 && (
                            <div className="flex justify-between py-1 text-muted-foreground">
                                <span>Penyesuaian (Potongan/Bonus)</span>
                                <span className="font-semibold tabular text-foreground">
                                    {payment.adjustment_amount > 0 ? '+' : ''}
                                    {formatIdr(payment.adjustment_amount)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-b py-2 text-base font-bold text-foreground">
                            <span>Total Dibayarkan</span>
                            <span className="font-display text-xl text-primary tabular">
                                {formatIdr(payment.net_amount)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tanda Tangan untuk Cetak */}
                <div className="mt-12 hidden print:grid grid-cols-2 gap-8 text-center text-xs">
                    <div>
                        <p className="text-muted-foreground">Penerima (Vendor Maklun)</p>
                        <div className="h-16"></div>
                        <p className="font-bold border-t pt-1 inline-block min-w-36">
                            {payment.tailor.name}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Yang Menyerahkan (Admin)</p>
                        <div className="h-16"></div>
                        <p className="font-bold border-t pt-1 inline-block min-w-36">
                            {payment.creator?.name ?? 'Admin Produksi'}
                        </p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
