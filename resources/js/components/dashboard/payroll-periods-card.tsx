import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatIdr } from '@/lib/format';
import type { PayrollPeriod } from '@/types';
import { useForm } from '@inertiajs/react';
import { Download, Lock, Plus, RefreshCw } from 'lucide-react';
import type { FormEvent } from 'react';

export function PayrollPeriodFormCard() {
    const form = useForm({ starts_at: '', ends_at: '', notes: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('payroll-periods.store'), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Periode Gajian 2 Mingguan</CardTitle>
                <CardDescription>Buat slot resmi 1-14 atau 15-akhir bulan.</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="flex flex-col gap-3" onSubmit={submit}>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FormField label="Mulai" htmlFor="payroll-start" error={form.errors.starts_at}>
                            <Input id="payroll-start" type="date" value={form.data.starts_at} onChange={(event) => form.setData('starts_at', event.target.value)} />
                        </FormField>
                        <FormField label="Selesai" htmlFor="payroll-end" error={form.errors.ends_at}>
                            <Input id="payroll-end" type="date" value={form.data.ends_at} onChange={(event) => form.setData('ends_at', event.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="Catatan" htmlFor="payroll-notes" error={form.errors.notes}>
                        <Textarea id="payroll-notes" rows={2} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
                    </FormField>
                    <Button type="submit" disabled={form.processing}>
                        <Plus />
                        Buat Periode
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export function PayrollPeriodsCard({ periods }: { periods: PayrollPeriod[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Periode Terakhir</CardTitle>
                <CardDescription>Generate slip dari qty selesai sesuai tanggal, lalu kunci sebelum dibayar.</CardDescription>
            </CardHeader>
            <CardContent>
                {periods.length ? (
                    <div className="flex flex-col gap-3">
                        {periods.map((period) => (
                            <PeriodRow key={period.id} period={period} />
                        ))}
                    </div>
                ) : (
                    <EmptyState>Belum ada periode gajian.</EmptyState>
                )}
            </CardContent>
        </Card>
    );
}

function PeriodRow({ period }: { period: PayrollPeriod }) {
    const form = useForm({});
    const isDraft = period.status === 'draft';

    return (
        <article className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{period.code}</p>
                    <Badge variant="secondary">{period.status_label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    {period.starts_at} - {period.ends_at}
                </p>
                <p className="text-sm text-muted-foreground">
                    {period.total_tailors} penjahit / {period.total_completed_qty} pcs / {formatIdr(period.total_amount)}
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    disabled={form.processing || !isDraft}
                    onClick={() => form.post(route('payroll-periods.generate', period.id), { preserveScroll: true })}
                >
                    <RefreshCw />
                    Generate
                </Button>
                <Button
                    size="sm"
                    disabled={form.processing || !isDraft || !period.generated_at}
                    onClick={() => form.post(route('payroll-periods.lock', period.id), { preserveScroll: true })}
                >
                    <Lock />
                    Kunci
                </Button>
                {period.generated_at && (
                    <Button asChild size="sm" variant="outline">
                        <a href={route('payroll-periods.export', period.id)}>
                            <Download />
                            Export
                        </a>
                    </Button>
                )}
            </div>
        </article>
    );
}
