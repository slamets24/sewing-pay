import { ConfirmButton } from '@/components/confirm-button';
import { FormField } from '@/components/form-field';
import { TailorSelect } from '@/components/sewing/quality/record-selects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDateTime, formatIdr } from '@/lib/format';
import { floorActions } from '@/services/floor-actions';
import type { ArticleRecord, PriceBenchmarkRow, TailorRecord } from '@/types/sewing';
import { useForm } from '@inertiajs/react';
import { Clock, LoaderCircle, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type TailorChoice = Pick<TailorRecord, 'id' | 'name' | 'code' | 'type'>;

type PriceBenchmarkSheetProps = {
    article: ArticleRecord | null;
    tailors: TailorChoice[];
    hourlyRate: number;
    isOwner: boolean;
    onOpenChange: (open: boolean) => void;
};

const ROLE_LABEL: Record<NonNullable<PriceBenchmarkRow['role']>, string> = {
    tercepat: 'Tercepat',
    sedang: 'Sedang',
    terlambat: 'Terlambat',
};

/** Sample times and the benchmark they produce. Adopting the number is a separate step from recording a sample. */
export function PriceBenchmarkSheet({ article, tailors, hourlyRate, isOwner, onOpenChange }: PriceBenchmarkSheetProps) {
    const benchmark = article?.benchmark ?? null;
    const [adopting, setAdopting] = useState(false);
    const form = useForm({ tailor_id: '' as number | '', color: '', started_at: '', finished_at: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!article) return;

        form.post(route('articles.samples.store', article.id), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => form.reset('color', 'started_at', 'finished_at'),
        });
    };

    const adopt = () => {
        if (!article || benchmark?.suggested_rate == null) return;

        floorActions.send(
            'patch',
            route('articles.update', article.id),
            { sewing_rate: benchmark.suggested_rate },
            { onStart: () => setAdopting(true), onFinish: () => setAdopting(false) },
        );
    };

    return (
        <Sheet open={article !== null} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
                <SheetHeader className="border-b bg-muted/60">
                    <SheetTitle className="font-display text-2xl font-bold uppercase">Patokan sample</SheetTitle>
                    <SheetDescription className="text-base text-muted-foreground">{article?.display_name}</SheetDescription>
                </SheetHeader>

                {article && (
                    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
                        <p className="text-base">
                            Catat waktu satu pcs per warna. Warna yang dikerjakan beberapa penjahit dirata-ratakan dulu, lalu diambil yang tercepat, sedang, dan terlambat. Tiap pcs dihitung {formatIdr(benchmark?.hourly_rate ?? hourlyRate)} per jam. Angka ini patokan; tarif resmi berubah hanya kalau Anda memakai patokan atau menyimpan tarif sendiri.
                        </p>

                        <BenchmarkMath article={article} adopting={adopting} isOwner={isOwner} onAdopt={adopt} />

                        {benchmark && benchmark.samples.length > 0 && (
                            <ul className="flex flex-col gap-2">
                                {benchmark.samples.map((sample) => (
                                    <li key={sample.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold">{sample.color}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {sample.tailor_name} · {sample.minutes_label} · {formatIdr(sample.price)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDateTime(sample.started_at)} – {formatDateTime(sample.finished_at)}
                                            </p>
                                        </div>
                                        {isOwner && <DeleteSample articleId={article.id} sampleId={sample.id} />}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {isOwner && (
                            <form onSubmit={submit} className="flex flex-col gap-4 border-t pt-4" noValidate>
                                <p className="flex items-center gap-2 font-semibold">
                                    <Clock className="size-4" aria-hidden />
                                    Catat satu pcs
                                </p>
                                <FormField label="Penjahit" htmlFor="sample-tailor" error={form.errors.tailor_id}>
                                    <TailorSelect
                                        id="sample-tailor"
                                        tailors={tailors}
                                        value={form.data.tailor_id === '' ? null : form.data.tailor_id}
                                        onChange={(tailorId) => form.setData('tailor_id', tailorId)}
                                        disabled={tailors.length === 0}
                                    />
                                </FormField>
                                {tailors.length === 0 && <p className="text-sm text-muted-foreground">Tambah penjahit aktif dulu.</p>}
                                <FormField label="Warna" htmlFor="sample-color" error={form.errors.color}>
                                    <Input
                                        id="sample-color"
                                        list="sample-colors"
                                        value={form.data.color}
                                        onChange={(event) => form.setData('color', event.target.value)}
                                        autoComplete="off"
                                        aria-invalid={!!form.errors.color || undefined}
                                    />
                                    <datalist id="sample-colors">
                                        {article.colors.map((color) => (
                                            <option key={color} value={color} />
                                        ))}
                                    </datalist>
                                </FormField>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField label="Mulai" htmlFor="sample-start" error={form.errors.started_at}>
                                        <Input
                                            id="sample-start"
                                            type="datetime-local"
                                            value={form.data.started_at}
                                            onChange={(event) => form.setData('started_at', event.target.value)}
                                            aria-invalid={!!form.errors.started_at || undefined}
                                        />
                                    </FormField>
                                    <FormField label="Selesai" htmlFor="sample-finish" error={form.errors.finished_at}>
                                        <Input
                                            id="sample-finish"
                                            type="datetime-local"
                                            value={form.data.finished_at}
                                            onChange={(event) => form.setData('finished_at', event.target.value)}
                                            aria-invalid={!!form.errors.finished_at || undefined}
                                        />
                                    </FormField>
                                </div>
                                <Button type="submit" disabled={form.processing || tailors.length === 0}>
                                    {form.processing ? <LoaderCircle className="animate-spin" /> : <Clock />}
                                    Simpan sample
                                </Button>
                            </form>
                        )}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

function BenchmarkMath({ article, adopting, isOwner, onAdopt }: { article: ArticleRecord; adopting: boolean; isOwner: boolean; onAdopt: () => void }) {
    const benchmark = article.benchmark;

    if (!benchmark || !benchmark.ready || benchmark.suggested_rate == null || benchmark.raw_average == null) {
        return (
            <p className="rounded-md border bg-muted/40 p-3 text-base">
                {benchmark ? `Sudah ${benchmark.color_count} dari ${benchmark.needed} warna.` : `Belum ada sample. Patokan dihitung setelah 3 warna.`}
            </p>
        );
    }

    const matches = article.sewing_rate === benchmark.suggested_rate;

    return (
        <div className="flex flex-col gap-3 rounded-md border bg-muted/40 p-3">
            <div>
                <p className="text-sm font-semibold text-muted-foreground">Patokan per pcs</p>
                <p className="font-display text-3xl leading-tight font-bold tabular">{formatIdr(benchmark.suggested_rate)}</p>
                <p className="text-sm text-muted-foreground">
                    Rata-rata mentah {formatIdr(benchmark.raw_average)}, dibulatkan ke ribuan. Dihitung {formatIdr(benchmark.hourly_rate)} per jam
                    {benchmark.calculated_at ? ` · ${formatDateTime(benchmark.calculated_at)}` : ''}.
                </p>
            </div>

            <ul className="flex flex-col gap-2">
                {benchmark.points.map((point) => (
                    <li key={point.role} className="text-base">
                        <span className="font-semibold">{point.role ? ROLE_LABEL[point.role] : 'Warna'}: </span>
                        {point.color} · {point.minutes_label} · {formatIdr(point.price)} · {point.tailor_label}
                    </li>
                ))}
            </ul>

            {benchmark.others.length > 0 && (
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">Tidak masuk rata-rata</p>
                    <ul className="mt-1 flex flex-col gap-1">
                        {benchmark.others.map((row) => (
                            <li key={row.color} className="text-sm text-muted-foreground">
                                {row.color} · {row.minutes_label} · {formatIdr(row.price)} · {row.tailor_label}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {matches ? (
                <p className="text-sm font-semibold">Tarif resmi memakai patokan ini.</p>
            ) : (
                <p className="text-sm">Tarif resmi tetap {article.sewing_rate > 0 ? formatIdr(article.sewing_rate) : 'kosong'} sampai Anda mengubahnya.</p>
            )}

            {isOwner && !matches && (
                <Button type="button" onClick={onAdopt} disabled={adopting}>
                    {adopting ? <LoaderCircle className="animate-spin" /> : null}
                    Pakai patokan {formatIdr(benchmark.suggested_rate)}
                </Button>
            )}
        </div>
    );
}

function DeleteSample({ articleId, sampleId }: { articleId: number; sampleId: number }) {
    const [busy, setBusy] = useState(false);

    return (
        <ConfirmButton
            confirmLabel="Hapus"
            disabled={busy}
            onConfirm={() => floorActions.send('delete', route('articles.samples.destroy', [articleId, sampleId]), {}, { onStart: () => setBusy(true), onFinish: () => setBusy(false) })}
            className="shrink-0"
            idleClassName="text-destructive hover:text-destructive"
        >
            <Trash2 />
            Hapus
        </ConfirmButton>
    );
}
