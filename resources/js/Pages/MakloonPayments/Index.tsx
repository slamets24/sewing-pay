import { Card } from '@/components/ui/card';
import { ConfirmAction } from '@/components/confirm-action';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { Section } from '@/components/sewing/section';
import { StatTile } from '@/components/sewing/stat-tile';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { formatIdr } from '@/lib/format';
import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    ChevronRight,
    FileText,
    History,
    Plus,
    Receipt,
    Trash2,
    Wallet,
} from 'lucide-react';

type MakloonTailorStat = {
    id: number;
    name: string;
    code: string;
    whatsapp_number: string | null;
    unpaid_count: number;
    unpaid_qty: number;
    unpaid_amount: number;
};

type PaymentRow = {
    id: number;
    code: string;
    payment_date: string;
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
    };
    creator: {
        name: string;
    } | null;
};

type IndexProps = {
    payments: {
        data: PaymentRow[];
        links: any[];
        total: number;
    };
    tailors: MakloonTailorStat[];
    selectedTailorId: number | null;
    summary: {
        total_unpaid_amount: number;
        total_unpaid_qty: number;
        total_paid_this_month: number;
    };
};

export default function MakloonPaymentIndex({ payments, tailors, summary }: IndexProps) {
    const handleDelete = (payment: PaymentRow) => {
        router.delete(route('makloon-payments.destroy', payment.id));
    };

    return (
        <AppLayout title="Pembayaran Maklun" shortTitle="Bayar maklun">
            <Head title="Pembayaran Maklun" />

            {/* Top Stat Tiles */}
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatTile
                    label="Belum dibayar (Maklun)"
                    value={formatIdr(summary.total_unpaid_amount)}
                    hint={`${summary.total_unpaid_qty} pcs jahitan menunggu dibayar`}
                    icon={Receipt}
                    tone="primary"
                />
                <StatTile
                    label="Dibayar bulan ini"
                    value={formatIdr(summary.total_paid_this_month)}
                    hint="Bulan kalender berjalan"
                    icon={Wallet}
                    tone="ready"
                />
                <div className="sm:col-span-2 lg:col-span-1">
                    <StatTile
                        label="Vendor maklun aktif"
                        value={`${tailors.length} vendor`}
                        hint="Terdaftar sebagai penjahit maklun"
                        icon={Building2}
                        tone="neutral"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Section Vendor & Tagihan */}
                <Section
                    title="Tagihan per vendor maklun"
                    icon={Building2}
                    description="Pilih vendor maklun untuk memproses pembayaran fleksibel (bisa per nota atau sekaligus)"
                >
                    {tailors.length === 0 ? (
                        <EmptyState>
                            <Building2 className="size-8 text-muted-foreground" aria-hidden />
                            <p className="text-base">Belum ada vendor maklun terdaftar.</p>
                            <Button asChild variant="outline" className="mt-2">
                                <Link href={route('tailors.index')}>Kelola Penjahit</Link>
                            </Button>
                        </EmptyState>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {tailors.map((tailor) => {
                                const hasUnpaid = tailor.unpaid_count > 0;
                                return (
                                    <Card asChild key={tailor.id}>
                                        <div

                                            className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-2xs transition-all hover:border-foreground/30"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-bold text-base text-foreground leading-snug">
                                                        {tailor.name}
                                                    </h3>
                                                    <ToneBadge tone="qc">{tailor.code}</ToneBadge>
                                                </div>

                                                {tailor.whatsapp_number && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        WA: {tailor.whatsapp_number}
                                                    </p>
                                                )}

                                                <div className="mt-4 rounded-lg bg-muted/50 p-2.5">
                                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                        Tagihan Belum Dibayar
                                                    </p>
                                                    <div className="mt-1 flex items-baseline justify-between">
                                                        <span className="font-display text-lg font-bold text-foreground">
                                                            {formatIdr(tailor.unpaid_amount)}
                                                        </span>
                                                        <span className="text-xs font-semibold text-muted-foreground">
                                                            {tailor.unpaid_qty} pcs ({tailor.unpaid_count} setor)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-2 border-t">
                                                {hasUnpaid ? (
                                                    <Button asChild className="w-full" size="sm">
                                                        <Link href={route('makloon-payments.create', { tailor_id: tailor.id })}>
                                                            <Plus className="size-4" />
                                                            Proses Bayar ({tailor.unpaid_count})
                                                        </Link>
                                                    </Button>
                                                ) : (
                                                    <Button variant="outline" size="sm" className="w-full" disabled>
                                                        Semua Lunas
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </Section>

                {/* Section Riwayat Pembayaran */}
                <Section
                    title="Riwayat pembayaran maklun"
                    icon={History}
                    description={payments.total > 0 ? `${payments.total} pembayaran tercatat` : undefined}
                >
                    {payments.data.length === 0 ? (
                        <EmptyState>
                            <FileText className="size-8 text-muted-foreground" aria-hidden />
                            <p className="text-base">Belum ada riwayat pembayaran maklun.</p>
                        </EmptyState>
                    ) : (
                        <Card asChild>
                            <div className="overflow-x-auto rounded-xl border bg-card shadow-2xs">
                                <Table scrollContainer={false} className="w-full text-left text-sm">
                                    <TableHeader className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        <TableRow>
                                            <TableHead className="h-auto whitespace-normal px-4 py-3">No. Faktur</TableHead>
                                            <TableHead className="h-auto whitespace-normal px-4 py-3">Tanggal</TableHead>
                                            <TableHead className="h-auto whitespace-normal px-4 py-3">Vendor Maklun</TableHead>
                                            <TableHead className="h-auto whitespace-normal px-4 py-3 text-right">Jumlah Pcs</TableHead>
                                            <TableHead className="h-auto whitespace-normal px-4 py-3 text-right">Total Dibayar</TableHead>
                                            <TableHead className="h-auto whitespace-normal px-4 py-3">Metode</TableHead>
                                            <TableHead className="h-auto whitespace-normal px-4 py-3 text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y">
                                        {payments.data.map((payment) => (
                                            <TableRow key={payment.id} className="hover:bg-muted/20 transition-colors">
                                                <TableCell className="whitespace-normal px-4 py-3 font-semibold text-primary">
                                                    <Link
                                                        href={route('makloon-payments.show', payment.id)}
                                                        className="hover:underline flex items-center gap-1.5"
                                                    >
                                                        <FileText className="size-3.5" />
                                                        {payment.code}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar className="size-3.5" />
                                                        {payment.payment_date}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="whitespace-normal px-4 py-3 font-medium text-foreground">
                                                    {payment.tailor.name}
                                                </TableCell>
                                                <TableCell className="whitespace-normal px-4 py-3 text-right font-semibold tabular">
                                                    {payment.total_qty} pcs
                                                </TableCell>
                                                <TableCell className="whitespace-normal px-4 py-3 text-right font-bold text-foreground tabular">
                                                    {formatIdr(payment.net_amount)}
                                                </TableCell>
                                                <TableCell className="whitespace-normal px-4 py-3">
                                                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium uppercase text-muted-foreground">
                                                        {payment.payment_method || 'transfer'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="whitespace-normal px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button asChild variant="ghost" size="sm">
                                                            <Link href={route('makloon-payments.show', payment.id)}>
                                                                Faktur
                                                                <ChevronRight className="size-3.5 ml-1" />
                                                            </Link>
                                                        </Button>
                                                        <ConfirmAction title={`Batalkan pembayaran ${payment.code}?`} description="Setoran akan dikembalikan ke daftar belum dibayar." confirmLabel="Batalkan pembayaran" destructive onConfirm={() => handleDelete(payment)}>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:bg-destructive/10"
                                                                title="Batalkan pembayaran"
                                                                aria-label={`Batalkan pembayaran ${payment.code}`}
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        </ConfirmAction>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    )}
                </Section>
            </div>
        </AppLayout>
    );
}
