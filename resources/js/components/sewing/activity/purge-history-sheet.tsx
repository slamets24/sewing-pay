import { FormField } from '@/components/form-field';
import { FormSheet } from '@/components/sewing/master/form-sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { todayIso } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

type Preview = { before: string; actions: number; rows: number };

const QUICK: { label: string; months: number }[] = [
    { label: 'Lebih dari 1 tahun', months: 12 },
    { label: 'Lebih dari 6 bulan', months: 6 },
    { label: 'Lebih dari 3 bulan', months: 3 },
];

const monthsAgo = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const longDate = (value: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`));

/**
 * Owner only: delete history older than a chosen date. Shows how much would go before asking for "HAPUS".
 * Today's history always stays, and the purge itself is written to the history.
 */
export function PurgeHistorySheet({ open, onOpenChange, oldest }: { open: boolean; onOpenChange: (open: boolean) => void; oldest: string | null }) {
    const form = useForm({ before: monthsAgo(12), confirm: '' });
    const [preview, setPreview] = useState<Preview | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !form.data.before) return;

        const controller = new AbortController();
        setLoading(true);
        fetch(route('activity-logs.purge-preview', { before: form.data.before }), { headers: { Accept: 'application/json' }, signal: controller.signal })
            .then((response) => (response.ok ? response.json() : null))
            .then((data: Preview | null) => setPreview(data))
            .catch(() => undefined)
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [open, form.data.before]);

    const ready = form.data.confirm === 'HAPUS' && (preview?.rows ?? 0) > 0;

    const submit = () =>
        form.delete(route('activity-logs.purge'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('confirm');
                onOpenChange(false);
            },
        });

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Hapus riwayat lama"
            description="Khusus Owner. Riwayat yang dihapus tidak bisa dikembalikan."
            submitLabel={preview && preview.actions > 0 ? `Hapus ${preview.actions} aktivitas` : 'Hapus'}
            processing={form.processing}
            disabled={!ready}
            destructive
            onSubmit={submit}
        >
            <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Hapus riwayat yang…</p>
                <div className="flex flex-wrap gap-2">
                    {QUICK.map((option) => {
                        const value = monthsAgo(option.months);

                        return (
                            <Button key={option.months} type="button" size="sm" variant={form.data.before === value ? 'default' : 'outline'} onClick={() => form.setData('before', value)}>
                                {option.label}
                            </Button>
                        );
                    })}
                </div>
            </div>

            <FormField label="Atau pilih: hapus semua riwayat sebelum tanggal" htmlFor="purge-before" error={form.errors.before}>
                <Input id="purge-before" type="date" max={todayIso()} value={form.data.before} onChange={(event) => form.setData('before', event.target.value)} />
            </FormField>

            <div className={cn('rounded-md border p-3 text-sm', preview && preview.rows > 0 ? 'border-destructive/40 bg-destructive/5' : 'bg-muted/40')}>
                {loading || !preview ? (
                    <p className="text-muted-foreground">Menghitung…</p>
                ) : preview.rows === 0 ? (
                    <p>
                        Tidak ada riwayat sebelum {longDate(preview.before)}.{oldest && ` Riwayat paling lama: ${longDate(oldest.slice(0, 10))}.`}
                    </p>
                ) : (
                    <p>
                        Akan dihapus: <strong>{preview.actions} aktivitas</strong> ({preview.rows} baris rincian) sebelum <strong>{longDate(preview.before)}</strong>.
                    </p>
                )}
            </div>

            <Alert>
                <TriangleAlert />
                <AlertDescription className="text-sm">
                    Riwayat hari ini tidak ikut terhapus. Penghapusan ini juga dicatat di riwayat (siapa, kapan, sampai tanggal berapa).
                </AlertDescription>
            </Alert>

            <FormField label="Ketik HAPUS untuk mengonfirmasi" htmlFor="purge-confirm" error={form.errors.confirm}>
                <Input id="purge-confirm" value={form.data.confirm} onChange={(event) => form.setData('confirm', event.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="HAPUS" />
            </FormField>
        </FormSheet>
    );
}
