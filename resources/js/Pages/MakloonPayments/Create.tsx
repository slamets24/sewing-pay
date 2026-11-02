import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { Section } from '@/components/sewing/section';
import { StickyBar } from '@/components/sewing/sticky-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { formatIdr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    Check,
    CheckSquare,
    CreditCard,
    DollarSign,
    PackageCheck,
    Square,
} from 'lucide-react';
import { useState } from 'react';

type TailorOption = {
    id: number;
    name: string;
    code: string;
    whatsapp_number: string | null;
};

type UnpaidDelivery = {
    id: number;
    delivered_at: string | null;
    date_formatted: string;
    wo_number: string;
    article_name: string;
    variant: string;
    qty: number;
    rate: number;
    subtotal: number;
    notes: string | null;
};

type CreateProps = {
    tailors: TailorOption[];
    selectedTailorId: number | null;
    unpaidDeliveries: UnpaidDelivery[];
};

export default function MakloonPaymentCreate({ tailors, selectedTailorId, unpaidDeliveries }: CreateProps) {
    const selectedTailor = tailors.find((t) => t.id === selectedTailorId);

    // Selected delivery IDs
    const [selectedIds, setSelectedIds] = useState<number[]>(() => unpaidDeliveries.map((d) => d.id));

    const form = useForm({
        tailor_id: selectedTailorId ?? 0,
        delivery_ids: selectedIds,
        payment_date: new Date().toISOString().split('T')[0],
        adjustment_amount: 0,
        payment_method: 'transfer',
        notes: '',
    });

    const toggleSelectAll = () => {
        if (selectedIds.length === unpaidDeliveries.length) {
            setSelectedIds([]);
            form.setData('delivery_ids', []);
        } else {
            const all = unpaidDeliveries.map((d) => d.id);
            setSelectedIds(all);
            form.setData('delivery_ids', all);
        }
    };

    const toggleDelivery = (id: number) => {
        const next = selectedIds.includes(id)
            ? selectedIds.filter((item) => item !== id)
            : [...selectedIds, id];

        setSelectedIds(next);
        form.setData('delivery_ids', next);
    };

    const handleTailorChange = (tailorId: number) => {
        router.get(
            route('makloon-payments.create'),
            { tailor_id: tailorId },
            { preserveState: false, preserveScroll: true }
        );
    };

    const selectedRows = unpaidDeliveries.filter((d) => selectedIds.includes(d.id));
    const totalQty = selectedRows.reduce((sum, d) => sum + d.qty, 0);
    const grossAmount = selectedRows.reduce((sum, d) => sum + d.subtotal, 0);
    const netAmount = Math.max(0, grossAmount + Number(form.data.adjustment_amount || 0));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.setData('delivery_ids', selectedIds);
        form.post(route('makloon-payments.store'));
    };

    return (
        <AppLayout title="Bayar Tagihan Maklun">
            <Head title="Bayar Tagihan Maklun" />

            <div className="mb-4">
                <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
                    <Link href={route('makloon-payments.index')}>
                        <ArrowLeft className="size-4 mr-1" />
                        Kembali ke Pembayaran Maklun
                    </Link>
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-28">
                {/* 1. Pilih Vendor Maklun */}
                <Section title="1. Vendor maklun" icon={Building2}>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {tailors.map((tailor) => {
                            const isCurrent = tailor.id === selectedTailorId;
                            return (
                                <button
                                    key={tailor.id}
                                    type="button"
                                    onClick={() => handleTailorChange(tailor.id)}
                                    className={cn(
                                        'flex min-h-16 flex-col items-start justify-center gap-1 rounded-xl border-2 bg-card p-3 text-left transition-all',
                                        isCurrent
                                            ? 'border-primary bg-primary/10 shadow-xs'
                                            : 'hover:border-foreground/30'
                                    )}
                                >
                                    <div className="flex w-full items-center justify-between">
                                        <span className="font-bold text-sm text-foreground">{tailor.name}</span>
                                        {isCurrent && <Check className="size-4 text-primary" />}
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">{tailor.code}</span>
                                </button>
                            );
                        })}
                    </div>
                </Section>

                {/* 2. Pilih Setoran Yang Mau Dibayar (Fleksibel!) */}
                <Section
                    title={`2. Setoran yang dibayar (${selectedIds.length} dari ${unpaidDeliveries.length} dipilih)`}
                    icon={PackageCheck}
                    description="Centang setoran mana saja yang ingin dibayarkan sekarang. Bisa bayar per nota atau borongan sekaligus."
                >
                    {unpaidDeliveries.length === 0 ? (
                        <EmptyState>
                            <PackageCheck className="size-8 text-muted-foreground" aria-hidden />
                            <p className="text-base">
                                Tidak ada setoran yang belum dibayar untuk {selectedTailor?.name ?? 'maklun ini'}.
                            </p>
                        </EmptyState>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleSelectAll}
                                    className="gap-2"
                                >
                                    {selectedIds.length === unpaidDeliveries.length ? (
                                        <>
                                            <Square className="size-4" />
                                            Batal Pilih Semua
                                        </>
                                    ) : (
                                        <>
                                            <CheckSquare className="size-4" />
                                            Pilih Semua ({unpaidDeliveries.length})
                                        </>
                                    )}
                                </Button>

                                <span className="text-xs font-semibold text-muted-foreground">
                                    {totalQty} pcs dipilih
                                </span>
                            </div>

                            <div className="overflow-x-auto rounded-xl border bg-card shadow-2xs">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        <tr>
                                            <th className="w-10 px-3 py-3 text-center">Pilih</th>
                                            <th className="px-3 py-3">Tgl Setor</th>
                                            <th className="px-3 py-3">WO & Artikel</th>
                                            <th className="px-3 py-3">Varian</th>
                                            <th className="px-3 py-3 text-right">Qty</th>
                                            <th className="px-3 py-3 text-right">Tarif</th>
                                            <th className="px-3 py-3 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {unpaidDeliveries.map((row) => {
                                            const isChecked = selectedIds.includes(row.id);
                                            return (
                                                <tr
                                                    key={row.id}
                                                    onClick={() => toggleDelivery(row.id)}
                                                    className={cn(
                                                        'cursor-pointer transition-colors',
                                                        isChecked ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/20'
                                                    )}
                                                >
                                                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleDelivery(row.id)}
                                                            className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                                                        {row.date_formatted}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="font-semibold text-foreground">
                                                            {row.article_name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground font-mono">
                                                            {row.wo_number}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-xs text-muted-foreground">
                                                        {row.variant || '-'}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-semibold tabular">
                                                        {row.qty} pcs
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-medium text-muted-foreground tabular text-xs">
                                                        {formatIdr(row.rate)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-bold text-foreground tabular">
                                                        {formatIdr(row.subtotal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Section>

                {/* 3. Detail Pembayaran & Penyesuaian */}
                {selectedIds.length > 0 && (
                    <Section title="3. Rincian & pembayaran" icon={CreditCard}>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <FormField label="Tanggal Pembayaran" htmlFor="payment-date">
                                <Input
                                    id="payment-date"
                                    type="date"
                                    value={form.data.payment_date}
                                    onChange={(e) => form.setData('payment_date', e.target.value)}
                                    required
                                />
                            </FormField>

                            <FormField label="Metode Pembayaran" htmlFor="payment-method">
                                <select
                                    id="payment-method"
                                    value={form.data.payment_method}
                                    onChange={(e) => form.setData('payment_method', e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="transfer">Transfer Bank</option>
                                    <option value="cash">Tunai (Cash)</option>
                                    <option value="lainnya">Lainnya</option>
                                </select>
                            </FormField>

                            <div>
                                <FormField
                                    label="Penyesuaian (Minus potongan, Plus bonus)"
                                    htmlFor="adjustment-amount"
                                >
                                    <Input
                                        id="adjustment-amount"
                                        type="number"
                                        step="1000"
                                        value={form.data.adjustment_amount}
                                        onChange={(e) => form.setData('adjustment_amount', Number(e.target.value))}
                                    />
                                </FormField>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Isi minus (contoh: -50000) untuk potongan
                                </p>
                            </div>

                            <div className="sm:col-span-2 lg:col-span-3">
                                <FormField label="Catatan Pembayaran (Opsional)" htmlFor="payment-notes">
                                    <Textarea
                                        id="payment-notes"
                                        rows={2}
                                        value={form.data.notes}
                                        onChange={(e) => form.setData('notes', e.target.value)}
                                        placeholder="Contoh: Pembayaran setor WO #1021 s.d #1023 via BCA"
                                    />
                                </FormField>
                            </div>
                        </div>
                    </Section>
                )}
            </form>

            {/* Bottom Sticky Action Bar */}
            <StickyBar
                title={`${selectedTailor?.name ?? 'Maklun'} · ${totalQty} pcs dipilih`}
                subtitle={`${selectedIds.length} setoran · Total: ${formatIdr(netAmount)}`}
            >
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Total yang dibayarkan</p>
                        <p className="font-display text-lg font-bold text-foreground tabular leading-none">
                            {formatIdr(netAmount)}
                        </p>
                    </div>

                    <Button
                        type="button"
                        size="lg"
                        onClick={handleSubmit}
                        disabled={selectedIds.length === 0 || form.processing}
                        className="gap-2"
                    >
                        <DollarSign className="size-4" />
                        {form.processing ? 'Memproses...' : 'Simpan & Buat Faktur'}
                    </Button>
                </div>
            </StickyBar>
        </AppLayout>
    );
}
