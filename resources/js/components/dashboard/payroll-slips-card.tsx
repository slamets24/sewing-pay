import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatIdr } from '@/lib/format';
import type { PayrollSlipSummary } from '@/types';
import { useForm } from '@inertiajs/react';
import { CircleCheck, ExternalLink, MessageCircle, SlidersHorizontal } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export function PayrollSlipsCard({ slips }: { slips: PayrollSlipSummary[] }) {
    const [search, setSearch] = useState('');
    const [adjusting, setAdjusting] = useState<PayrollSlipSummary | null>(null);

    const query = search.trim().toLowerCase();
    const filtered = query
        ? slips.filter((slip) => [slip.tailor_name, slip.period_code, slip.status_label].join(' ').toLowerCase().includes(query))
        : slips;

    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-base">Slip Terakhir</CardTitle>
                <CardDescription>Link publik ini yang dikirim ke WhatsApp penjahit.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {!slips.length ? (
                    <EmptyState>Belum ada slip gaji.</EmptyState>
                ) : (
                    <>
                        <Input aria-label="Cari slip gaji" placeholder="Cari penjahit, periode, atau status" value={search} onChange={(event) => setSearch(event.target.value)} />

                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Penjahit</TableHead>
                                        <TableHead>Periode</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((slip) => (
                                        <TableRow key={slip.id}>
                                            <TableCell className="font-medium">{slip.tailor_name}</TableCell>
                                            <TableCell>{slip.period_code}</TableCell>
                                            <TableCell className="text-right tabular-nums">{slip.completed_qty}</TableCell>
                                            <TableCell className="text-right">
                                                <SlipAmount slip={slip} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="secondary">{slip.status_label}</Badge>
                                                    {slip.paid_at && <span className="text-xs text-muted-foreground">{slip.paid_at}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <SlipActions slip={slip} onAdjust={() => setAdjusting(slip)} className="justify-end" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="grid gap-3 md:hidden">
                            {filtered.map((slip) => (
                                <article key={slip.id} className="flex flex-col gap-3 rounded-lg border p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{slip.tailor_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {slip.period_code} / {slip.completed_qty} pcs
                                            </p>
                                            <Badge variant="secondary" className="mt-1">
                                                {slip.status_label}
                                            </Badge>
                                        </div>
                                        <SlipAmount slip={slip} />
                                    </div>
                                    <SlipActions slip={slip} onAdjust={() => setAdjusting(slip)} />
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>

            <AdjustmentSheet slip={adjusting} onClose={() => setAdjusting(null)} />
        </Card>
    );
}

function SlipAmount({ slip }: { slip: PayrollSlipSummary }) {
    return (
        <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="font-semibold tabular-nums">{formatIdr(slip.net_amount ?? slip.gross_amount)}</span>
            {(slip.bonus_amount > 0 || slip.deduction_amount > 0) && (
                <span className="text-xs text-muted-foreground tabular-nums">
                    +{formatIdr(slip.bonus_amount)} / -{formatIdr(slip.deduction_amount)}
                </span>
            )}
        </div>
    );
}

function SlipActions({ slip, onAdjust, className }: { slip: PayrollSlipSummary; onAdjust: () => void; className?: string }) {
    const paidForm = useForm({});

    return (
        <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
            {slip.whatsapp_url && (
                <Button asChild size="sm" variant="outline">
                    <a href={slip.whatsapp_url} target="_blank" rel="noreferrer">
                        <MessageCircle />
                        WA
                    </a>
                </Button>
            )}
            <Button asChild size="sm" variant="outline">
                <a href={slip.public_url} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    Buka
                </a>
            </Button>
            <Button size="sm" variant="outline" disabled={!slip.can_update_adjustment} onClick={onAdjust}>
                <SlidersHorizontal />
                Atur
            </Button>
            <Button
                size="sm"
                disabled={!slip.can_mark_paid || paidForm.processing}
                onClick={() => paidForm.post(route('payroll-slips.paid', slip.id), { preserveScroll: true })}
            >
                <CircleCheck />
                Dibayar
            </Button>
        </div>
    );
}

function AdjustmentSheet({ slip, onClose }: { slip: PayrollSlipSummary | null; onClose: () => void }) {
    return (
        <Sheet open={slip !== null} onOpenChange={(open) => !open && onClose()}>
            <SheetContent>
                {/* Keyed so the form re-initialises with each slip's current values. */}
                {slip && <AdjustmentForm key={slip.id} slip={slip} onDone={onClose} />}
            </SheetContent>
        </Sheet>
    );
}

function AdjustmentForm({ slip, onDone }: { slip: PayrollSlipSummary; onDone: () => void }) {
    const form = useForm({
        bonus_amount: String(slip.bonus_amount ?? 0),
        deduction_amount: String(slip.deduction_amount ?? 0),
        notes: slip.notes ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(route('payroll-slips.adjustment.update', slip.id), { preserveScroll: true, onSuccess: onDone });
    };

    return (
        <form className="flex h-full flex-col" onSubmit={submit}>
            <SheetHeader>
                <SheetTitle>Bonus & potongan</SheetTitle>
                <SheetDescription>
                    {slip.tailor_name} · {slip.period_code} · kotor {formatIdr(slip.gross_amount)}
                </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 px-4">
                <FormField label="Bonus" htmlFor="slip-bonus" error={form.errors.bonus_amount}>
                    <Input
                        id="slip-bonus"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={form.data.bonus_amount}
                        onChange={(event) => form.setData('bonus_amount', event.target.value)}
                    />
                </FormField>
                <FormField label="Potongan / kasbon" htmlFor="slip-deduction" error={form.errors.deduction_amount}>
                    <Input
                        id="slip-deduction"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={form.data.deduction_amount}
                        onChange={(event) => form.setData('deduction_amount', event.target.value)}
                    />
                </FormField>
                <FormField label="Catatan" htmlFor="slip-notes" error={form.errors.notes}>
                    <Textarea
                        id="slip-notes"
                        rows={3}
                        placeholder="Bonus hadir, kasbon, denda, dll."
                        value={form.data.notes}
                        onChange={(event) => form.setData('notes', event.target.value)}
                    />
                </FormField>
            </div>
            <SheetFooter>
                <Button type="submit" disabled={form.processing}>
                    Simpan
                </Button>
                <Button type="button" variant="outline" onClick={onDone}>
                    Batal
                </Button>
            </SheetFooter>
        </form>
    );
}
