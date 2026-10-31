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
import { Check, Clock, LoaderCircle, Play, Square, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

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

const SHIFT_RATES: Record<number, number> = {
    9: 241_400,
    10: 265_000,
    11: 295_000,
    12: 321_800,
};

const SHIFT_OPTIONS = [9, 10, 11, 12];

/** Sample times and the benchmark they produce. Adopting the number is a separate step from recording a sample. */
export function PriceBenchmarkSheet({ article, tailors, isOwner, onOpenChange }: PriceBenchmarkSheetProps) {
    const benchmark = article?.benchmark ?? null;
    const [adopting, setAdopting] = useState(false);

    // Form data
    const form = useForm({
        tailor_id: '' as number | '',
        color: '',
        working_hours: 9,
        duration_minutes: '' as number | '',
    });

    // Stopwatch state
    const [isTiming, setIsTiming] = useState(false);
    const [secondsElapsed, setSecondsElapsed] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isTiming) {
            interval = setInterval(() => {
                setSecondsElapsed((prev) => prev + 1);
            }, 1000);
        } else {
            if (interval) clearInterval(interval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTiming]);

    const handleStopTimer = () => {
        setIsTiming(false);
        const mins = Math.max(1, Math.round(secondsElapsed / 60));
        form.setData('duration_minutes', mins);
        setSecondsElapsed(0);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!article) return;

        form.post(route('articles.samples.store', article.id), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                form.reset('color', 'duration_minutes');
                setIsTiming(false);
                setSecondsElapsed(0);
            },
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

    // Live calculation of preview
    const selectedAllowance = SHIFT_RATES[form.data.working_hours] ?? 241400;
    const ratePerMinute = selectedAllowance / (form.data.working_hours * 60);
    const estimatedPieceCost = form.data.duration_minutes
        ? Math.round(Number(form.data.duration_minutes) * ratePerMinute)
        : null;

    return (
        <Sheet open={article !== null} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
                <SheetHeader className="border-b bg-muted/60">
                    <SheetTitle className="font-display text-2xl font-bold uppercase">Patokan sample</SheetTitle>
                    <SheetDescription className="text-base text-muted-foreground">{article?.display_name}</SheetDescription>
                </SheetHeader>

                {article && (
                    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
                        <BenchmarkMath article={article} adopting={adopting} isOwner={isOwner} onAdopt={adopt} />

                        {benchmark && benchmark.samples.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sample Tercatat ({benchmark.samples.length})</p>
                                <ul className="flex flex-col gap-2">
                                    {benchmark.samples.map((sample) => (
                                        <li key={sample.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3 shadow-2xs">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-base">{sample.color}</p>
                                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                        {formatIdr(sample.price)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {sample.tailor_name} {sample.working_hours ? `(${sample.working_hours}j)` : ''} · Durasi: {sample.minutes_label}
                                                </p>
                                            </div>
                                            {isOwner && <DeleteSample articleId={article.id} sampleId={sample.id} />}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {isOwner && (
                            <form onSubmit={submit} className="flex flex-col gap-4 border-t pt-4" noValidate>
                                <div className="flex items-center justify-between">
                                    <p className="flex items-center gap-2 font-semibold">
                                        <Clock className="size-4" aria-hidden />
                                        Catat Satu Sample
                                    </p>
                                    <span className="text-xs text-muted-foreground">
                                        Rate: <strong>Rp {Math.round(ratePerMinute)}/menit</strong>
                                    </span>
                                </div>

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

                                {/* Standar Acuan Jam Masuk */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            Standar Acuan Jam Masuk (Perhitungan Sample)
                                        </label>
                                        <span className="text-[10px] text-muted-foreground">Bukan uang makan riil</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {SHIFT_OPTIONS.map((opt) => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => form.setData('working_hours', opt)}
                                                className={`rounded-lg py-2 px-1 text-center text-xs font-semibold border transition-all ${
                                                    form.data.working_hours === opt
                                                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                                        : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                <div>{opt} Jam</div>
                                                <div className="text-[10px] font-normal opacity-85">
                                                    {formatIdr(SHIFT_RATES[opt])}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <FormField label="Warna Sample" htmlFor="sample-color" error={form.errors.color}>
                                    <Input
                                        id="sample-color"
                                        list="sample-colors"
                                        placeholder="Contoh: Hitam, Navy, Merah..."
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

                                {/* Waktu Pengerjaan */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="sample-duration" className="text-xs font-medium text-muted-foreground">
                                            Waktu Pengerjaan (Menit)
                                        </label>
                                        {/* Stopwatch helper */}
                                        {!isTiming ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSecondsElapsed(0);
                                                    setIsTiming(true);
                                                }}
                                                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                                            >
                                                <Play className="size-3 fill-current" />
                                                Pakai Stopwatch
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleStopTimer}
                                                className="flex items-center gap-1 text-xs text-rose-600 hover:underline font-semibold animate-pulse"
                                            >
                                                <Square className="size-3 fill-current" />
                                                Berhenti ({Math.floor(secondsElapsed / 60)}m {secondsElapsed % 60}s)
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="sample-duration"
                                            type="number"
                                            min="1"
                                            max="1440"
                                            placeholder="Contoh: 40"
                                            value={form.data.duration_minutes}
                                            onChange={(event) =>
                                                form.setData(
                                                    'duration_minutes',
                                                    event.target.value === '' ? '' : Number(event.target.value),
                                                )
                                            }
                                            className="text-base font-semibold"
                                        />
                                        <span className="text-sm font-medium text-muted-foreground">Menit</span>
                                    </div>
                                    {form.errors.duration_minutes && (
                                        <p className="text-xs text-destructive">{form.errors.duration_minutes}</p>
                                    )}

                                    {/* Estimated price preview */}
                                    {estimatedPieceCost !== null && (
                                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-2 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                                            <span>Estimasi biaya 1 pcs ini:</span>
                                            <strong className="text-sm font-bold">{formatIdr(estimatedPieceCost)}</strong>
                                        </div>
                                    )}
                                </div>

                                <Button type="submit" disabled={form.processing || tailors.length === 0} className="mt-2">
                                    {form.processing ? <LoaderCircle className="animate-spin" /> : <Clock />}
                                    Simpan Sample
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
                <p className="text-sm font-semibold text-muted-foreground">Patokan Tarif Resmi</p>
                <p className="font-display text-3xl leading-tight font-bold tabular text-primary">{formatIdr(benchmark.suggested_rate)}</p>
                <p className="text-xs text-muted-foreground">
                    Rata-rata mentah {formatIdr(benchmark.raw_average)}, dibulatkan ke ribuan
                    {benchmark.calculated_at ? ` · Dihitung ${formatDateTime(benchmark.calculated_at)}` : ''}.
                </p>
            </div>

            <ul className="flex flex-col gap-2">
                {benchmark.points.map((point) => (
                    <li key={point.role} className="text-sm">
                        <span className="font-semibold">{point.role ? ROLE_LABEL[point.role] : 'Warna'}: </span>
                        {point.color} · {point.minutes_label} · <strong className="text-foreground">{formatIdr(point.price)}</strong> · {point.tailor_label}
                    </li>
                ))}
            </ul>

            {benchmark.others.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-muted-foreground">Tidak masuk rata-rata (warna lainnya)</p>
                    <ul className="mt-1 flex flex-col gap-1">
                        {benchmark.others.map((row) => (
                            <li key={row.color} className="text-xs text-muted-foreground">
                                {row.color} · {row.minutes_label} · {formatIdr(row.price)} · {row.tailor_label}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {matches ? (
                <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <Check className="size-4" />
                    Tarif resmi sudah memakai patokan ini.
                </p>
            ) : (
                <p className="text-xs text-muted-foreground">
                    Tarif resmi saat ini: {article.sewing_rate > 0 ? formatIdr(article.sewing_rate) : 'Belum diatur'}.
                </p>
            )}

            {isOwner && !matches && (
                <Button type="button" onClick={onAdopt} disabled={adopting} className="mt-1 font-bold">
                    {adopting ? <LoaderCircle className="animate-spin" /> : null}
                    Pakai Patokan {formatIdr(benchmark.suggested_rate)}
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
            <Trash2 className="size-4" />
            Hapus
        </ConfirmButton>
    );
}
