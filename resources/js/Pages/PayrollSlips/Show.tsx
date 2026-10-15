import { AppLogo } from '@/components/app-logo';
import { StatCard } from '@/components/tailor-payroll/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatIdr, joinMeta } from '@/lib/format';
import { Head } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';

type SlipLine = {
    id: number;
    article_name: string;
    color: string | null;
    size: string | null;
    work_type_name: string;
    completed_qty: number;
    unit_rate_amount: number;
    subtotal_amount: number;
    completed_at: string;
};

type PayrollSlipShowProps = {
    slip: {
        invoice_number: string;
        status_label: string;
        completed_qty: number;
        gross_amount: number;
        bonus_amount: number;
        deduction_amount: number;
        net_amount: number;
        whatsapp_url: string | null;
        tailor: { name: string; code: string; whatsapp_number: string | null };
        period: { code: string; starts_at: string; ends_at: string; status_label: string };
        lines: SlipLine[];
    };
};

export default function PayrollSlipShow({ slip }: PayrollSlipShowProps) {
    return (
        <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
            <Head title={`Slip Gaji ${slip.invoice_number}`} />

            <div className="mx-auto flex max-w-5xl flex-col gap-5">
                <AppLogo />

                <Card>
                    <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-semibold">Slip Gaji Jahit</h1>
                                <Badge variant="secondary">{slip.status_label}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{slip.invoice_number}</p>
                            <div className="text-sm">
                                <p className="font-medium">
                                    {slip.tailor.name} / {slip.tailor.code}
                                </p>
                                <p className="text-muted-foreground">
                                    Periode {slip.period.starts_at} - {slip.period.ends_at}
                                </p>
                            </div>
                        </div>
                        {slip.whatsapp_url && (
                            <Button asChild>
                                <a href={slip.whatsapp_url} target="_blank" rel="noreferrer">
                                    <MessageCircle />
                                    Kirim WhatsApp
                                </a>
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard label="Total Qty" value={slip.completed_qty} />
                    <StatCard label="Gaji Kotor" value={formatIdr(slip.gross_amount)} valueClassName="text-xl" />
                    <StatCard label="Bonus / Potongan" value={formatIdr(slip.bonus_amount - slip.deduction_amount)} valueClassName="text-xl" />
                    <StatCard label="Total Diterima" value={formatIdr(slip.net_amount)} valueClassName="text-xl" />
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Detail Pekerjaan</CardTitle>
                        <CardDescription>Semua item memakai snapshot tarif saat pekerjaan dicatat selesai.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Artikel</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Tarif</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {slip.lines.map((line) => (
                                        <TableRow key={line.id}>
                                            <TableCell>{line.completed_at}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span>{line.article_name}</span>
                                                    <span className="text-xs text-muted-foreground">{joinMeta(line.color, line.size, line.work_type_name)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{line.completed_qty}</TableCell>
                                            <TableCell className="text-right tabular-nums">{formatIdr(line.unit_rate_amount)}</TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">{formatIdr(line.subtotal_amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="grid gap-3 md:hidden">
                            {slip.lines.map((line) => (
                                <article key={line.id} className="rounded-lg border p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-medium">{line.article_name}</p>
                                            <p className="text-sm text-muted-foreground">{joinMeta(line.color, line.size, line.work_type_name)}</p>
                                            <p className="text-xs text-muted-foreground">{line.completed_at}</p>
                                        </div>
                                        <p className="shrink-0 text-sm font-semibold tabular-nums">{formatIdr(line.subtotal_amount)}</p>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {line.completed_qty} pcs × {formatIdr(line.unit_rate_amount)}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
