import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import {
    brandColor,
    brandEvenness,
    filterTailors,
    niceMax,
    valueOf,
    type Distribution,
    type DistributionTailor,
    type Measure,
    type TailorScope,
} from '@/domain/report/distribution';
import { formatIdr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, MinusCircle, Scale, Table2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

const SCOPES: { value: TailorScope; label: string }[] = [
    { value: 'internal', label: 'Penjahit internal' },
    { value: 'makloon', label: 'Makloon' },
    { value: 'all', label: 'Semua' },
];

const MEASURES: { value: Measure; label: string }[] = [
    { value: 'qty', label: 'Pcs' },
    { value: 'amount', label: 'Nilai upah' },
];

const formatValue = (value: number, measure: Measure) =>
    measure === 'amount' ? formatIdr(Math.round(value)) : `${Number.isInteger(value) ? value : value.toFixed(1)} pcs`;

/** Pemerataan pembagian hancaan: per penjahit (batang bertumpuk per brand) dan rata-rata per brand. */
export function DistributionCharts({ distribution }: { distribution: Distribution }) {
    const [scope, setScope] = useState<TailorScope>('internal');
    const [measure, setMeasure] = useState<Measure>('qty');

    const tailors = useMemo(
        () => [...filterTailors(distribution.tailors, scope)].sort((a, b) => b[measure] - a[measure]),
        [distribution.tailors, scope, measure],
    );
    const evenness = useMemo(() => brandEvenness(distribution.brands, tailors, measure), [distribution.brands, tailors, measure]);
    const brandsInView = distribution.brands
        .map((brand, index) => ({ brand, color: brandColor(brand, index) }))
        .filter(({ brand }) => tailors.some((tailor) => valueOf(tailor.segments[brand.key], measure) > 0));

    return (
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
            <header className="flex flex-col gap-3 border-b border-border/60 pb-3.5">
                <div>
                    <h3 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
                        <Scale className="size-4.5 text-primary" />
                        Pemerataan pembagian hancaan
                    </h3>
                    <p className="text-xs text-muted-foreground">Dari ambilan penjahit dalam periode ini (ambilan yang dibatalkan tidak dihitung).</p>
                </div>
                {/* Filter dalam satu baris di atas kedua grafik */}
                <div className="flex flex-wrap items-center gap-2">
                    <Segmented options={SCOPES} value={scope} onChange={setScope} label="Jenis penjahit" />
                    <Segmented options={MEASURES} value={measure} onChange={setMeasure} label="Ukuran" />
                </div>
            </header>

            {tailors.length === 0 ? (
                <EmptyState>Belum ada ambilan hancaan untuk pilihan ini dalam periode ini.</EmptyState>
            ) : (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <PerTailorChart tailors={tailors} brands={brandsInView} measure={measure} />
                    <PerBrandChart rows={evenness} measure={measure} />
                </div>
            )}
        </section>
    );
}

function Segmented<T extends string>({
    options,
    value,
    onChange,
    label,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    label: string;
}) {
    return (
        <div className="flex rounded-lg bg-muted/60 p-0.5" role="group" aria-label={label}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                        value === option.value ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

type BrandSwatch = { brand: Distribution['brands'][number]; color: string };

function Legend({ brands }: { brands: BrandSwatch[] }) {
    return (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Keterangan warna brand">
            {brands.map(({ brand, color }) => (
                <li key={brand.key} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[3px]" style={{ background: color }} aria-hidden />
                    <span className="text-foreground">{brand.name}</span>
                </li>
            ))}
        </ul>
    );
}

/** Grafik 1: satu batang per penjahit, isinya bertumpuk per brand. Garis putus-putus = rata-rata per penjahit. */
function PerTailorChart({ tailors, brands, measure }: { tailors: DistributionTailor[]; brands: BrandSwatch[]; measure: Measure }) {
    const [hover, setHover] = useState<{ tailorId: number; key: string } | null>(null);
    const [showTable, setShowTable] = useState(false);
    const totals = tailors.map((tailor) => tailor[measure]);
    const max = niceMax(Math.max(...totals));
    const average = totals.reduce((sum, value) => sum + value, 0) / tailors.length;
    const averagePct = (average / max) * 100;

    return (
        <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="flex items-center gap-1.5 text-sm font-bold">
                    <Users className="size-4 text-muted-foreground" />
                    Per penjahit
                </h4>
                <p className="text-xs text-muted-foreground">
                    Rata-rata <span className="font-semibold text-foreground">{formatValue(average, measure)}</span> per penjahit
                </p>
            </div>
            <Legend brands={brands} />

            <div className="relative flex flex-col gap-2">
                {/* Garis rata-rata, digambar sekali melintasi semua batang */}
                <div className="pointer-events-none absolute inset-y-0 right-16 left-24 sm:left-32" aria-hidden>
                    <div className="absolute inset-y-0 border-l-2 border-dashed border-foreground/35" style={{ left: `${averagePct}%` }} />
                </div>

                {tailors.map((tailor) => {
                    const total = tailor[measure];
                    const segments = brands
                        .map(({ brand, color }) => ({ brand, color, value: valueOf(tailor.segments[brand.key], measure) }))
                        .filter((segment) => segment.value > 0);
                    const hovered = hover?.tailorId === tailor.id ? segments.find((segment) => segment.brand.key === hover.key) : undefined;

                    return (
                        <div key={tailor.id} className="relative flex items-center gap-2">
                            <span className="w-22 shrink-0 truncate text-xs font-semibold sm:w-30" title={tailor.name}>
                                {tailor.name}
                                {tailor.type === 'makloon' && <span className="font-normal text-muted-foreground"> · mkl</span>}
                            </span>
                            <div className="relative h-6 min-w-0 flex-1" onMouseLeave={() => setHover(null)}>
                                <div className="flex h-full gap-[2px]" style={{ width: `${(total / max) * 100}%` }}>
                                    {segments.map((segment, index) => (
                                        <button
                                            key={segment.brand.key}
                                            type="button"
                                            aria-label={`${tailor.name}, ${segment.brand.name}: ${formatValue(segment.value, measure)}`}
                                            onMouseEnter={() => setHover({ tailorId: tailor.id, key: segment.brand.key })}
                                            onFocus={() => setHover({ tailorId: tailor.id, key: segment.brand.key })}
                                            onBlur={() => setHover(null)}
                                            className={cn(
                                                'h-full min-w-[3px] outline-offset-2 transition-opacity',
                                                index === segments.length - 1 && 'rounded-r-[4px]',
                                                hover && hover.tailorId === tailor.id && hover.key !== segment.brand.key && 'opacity-50',
                                            )}
                                            style={{ flexGrow: segment.value, flexBasis: 0, background: segment.color }}
                                        />
                                    ))}
                                </div>
                                {hovered && (
                                    <div className="absolute bottom-full left-0 z-10 mb-1.5 w-max max-w-64 rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                                        <p className="flex items-center gap-1.5 font-semibold">
                                            <span className="size-2.5 rounded-[3px]" style={{ background: hovered.color }} aria-hidden />
                                            {tailor.name} · {hovered.brand.name}
                                        </p>
                                        <p className="text-muted-foreground">
                                            {formatValue(valueOf(tailor.segments[hovered.brand.key], 'qty'), 'qty')} ·{' '}
                                            {formatIdr(valueOf(tailor.segments[hovered.brand.key], 'amount'))} ·{' '}
                                            {Math.round((hovered.value / total) * 100)}% dari ambilannya
                                        </p>
                                    </div>
                                )}
                            </div>
                            <span className="w-14 shrink-0 text-right text-xs font-semibold tabular">
                                {measure === 'amount' ? formatIdr(total).replace('Rp', '').trim() : total}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                    <span className="mr-1 inline-block w-4 border-t-2 border-dashed border-foreground/35 align-middle" aria-hidden />
                    garis = rata-rata · skala 0–{formatValue(max, measure)}
                </p>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowTable((value) => !value)} aria-expanded={showTable}>
                    <Table2 className="size-3.5" />
                    {showTable ? 'Tutup tabel' : 'Lihat tabel'}
                </Button>
            </div>
            {showTable && <DistributionTable tailors={tailors} brands={brands} measure={measure} />}
        </div>
    );
}

function DistributionTable({ tailors, brands, measure }: { tailors: DistributionTailor[]; brands: BrandSwatch[]; measure: Measure }) {
    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                        <th className="px-2.5 py-2 text-left font-semibold">Penjahit</th>
                        {brands.map(({ brand }) => (
                            <th key={brand.key} className="px-2.5 py-2 text-right font-semibold whitespace-nowrap">
                                {brand.name}
                            </th>
                        ))}
                        <th className="px-2.5 py-2 text-right font-semibold">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {tailors.map((tailor) => (
                        <tr key={tailor.id} className="border-t">
                            <td className="px-2.5 py-1.5 font-semibold whitespace-nowrap">{tailor.name}</td>
                            {brands.map(({ brand }) => (
                                <td key={brand.key} className="px-2.5 py-1.5 text-right tabular">
                                    {valueOf(tailor.segments[brand.key], measure) > 0
                                        ? formatValue(valueOf(tailor.segments[brand.key], measure), measure)
                                        : '–'}
                                </td>
                            ))}
                            <td className="px-2.5 py-1.5 text-right font-semibold tabular">{formatValue(tailor[measure], measure)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const LEVELS = {
    even: { label: 'Merata', icon: CheckCircle2, className: 'bg-stage-done/10 text-stage-done' },
    fair: { label: 'Cukup merata', icon: MinusCircle, className: 'bg-stage-sewing/10 text-stage-sewing' },
    uneven: { label: 'Timpang', icon: AlertTriangle, className: 'bg-stage-revision/10 text-stage-revision' },
} as const;

/** Grafik 2: per brand, batang = rata-rata per penjahit, garis tipis = rentang terendah–tertinggi. */
function PerBrandChart({ rows, measure }: { rows: ReturnType<typeof brandEvenness>; measure: Measure }) {
    const max = niceMax(Math.max(1, ...rows.map((row) => row.max.value)));

    return (
        <div className="flex min-w-0 flex-col gap-3">
            <div>
                <h4 className="flex items-center gap-1.5 text-sm font-bold">
                    <Scale className="size-4 text-muted-foreground" />
                    Rata-rata per brand
                </h4>
                <p className="text-xs text-muted-foreground">Batang = rata-rata per penjahit · garis = terendah sampai tertinggi.</p>
            </div>

            <ul className="flex flex-col gap-3.5">
                {rows.map((row) => {
                    const level = LEVELS[row.level];
                    const LevelIcon = level.icon;

                    return (
                        <li key={row.brand.key} className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                                    <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: row.color }} aria-hidden />
                                    <span className="truncate">{row.brand.name}</span>
                                </span>
                                <span
                                    className={cn(
                                        'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                        level.className,
                                    )}
                                >
                                    <LevelIcon className="size-3" />
                                    {level.label}
                                </span>
                            </div>
                            <div
                                className="relative h-5"
                                title={`${row.brand.name}: rata-rata ${formatValue(row.average, measure)}, terendah ${formatValue(row.min.value, measure)} (${row.min.name}), tertinggi ${formatValue(row.max.value, measure)} (${row.max.name})`}
                            >
                                <div
                                    className="absolute inset-y-1 left-0 rounded-r-[4px]"
                                    style={{ width: `${(row.average / max) * 100}%`, background: row.color }}
                                />
                                {/* rentang terendah–tertinggi */}
                                <div
                                    className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground/60"
                                    style={{ left: `${(row.min.value / max) * 100}%`, width: `${((row.max.value - row.min.value) / max) * 100}%` }}
                                />
                                <div className="absolute inset-y-0 w-0.5 bg-foreground/60" style={{ left: `${(row.min.value / max) * 100}%` }} />
                                <div
                                    className="absolute inset-y-0 w-0.5 -translate-x-full bg-foreground/60"
                                    style={{ left: `${(row.max.value / max) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Rata-rata <span className="font-semibold text-foreground">{formatValue(row.average, measure)}</span> · terendah{' '}
                                {formatValue(row.min.value, measure)} ({row.min.name}) · tertinggi {formatValue(row.max.value, measure)} (
                                {row.max.name}) · dapat {row.takers} dari {row.tailorCount} penjahit
                            </p>
                        </li>
                    );
                })}
            </ul>
            <p className="text-[11px] text-muted-foreground">
                Penjahit yang tidak dapat brand itu dihitung 0. Merata = selisih kecil antar penjahit; Timpang = sebagian penjahit dapat jauh lebih
                banyak.
            </p>
        </div>
    );
}
