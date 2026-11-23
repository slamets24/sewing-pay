import { Card } from '@/components/ui/card';
import { ConfirmAction } from '@/components/confirm-action';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/empty-state';
import { PageIntro, Section } from '@/components/sewing/section';
import { StatTile } from '@/components/sewing/stat-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatIdr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import {
    CalendarCheck,
    ChevronLeft,
    ChevronRight,
    CloudDownload,
    DollarSign,
    Plus,
    Save,
    Settings2,
    Sparkles,
    Target,
    Trash2,
    UserCheck,
} from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';

type AttendanceRow = {
    id: number | null;
    tailor_id: number;
    tailor_name: string;
    tailor_code: string | null;
    date: string;
    clock_in: string | null;
    clock_out: string | null;
    working_hours: number;
    meal_allowance: number;
    status: 'present' | 'permission' | 'sick' | 'alpha' | 'off';
    is_self_clocked: boolean;
    is_recorded: boolean;
    note: string;
    /** Uang makan penjahit ini menurut masa kerjanya, dan potongannya kalau tidak memenuhi hari target. */
    meal_rule: MealRule;
};

type MealRule = { amount: number; target_deduction: number; tenure_label: string | null };

type MealTier = { min_years: number; amount: number; target_deduction: number };

type MealSettings = { tiers: MealTier[]; target_start: string; target_end: string };

type TargetDayInfo = { start: string; end: string; note: string | null };

type AttendanceProps = {
    date: string;
    rows: AttendanceRow[];
    summary: {
        present_count: number;
        total_allowance: number;
        permission_count: number;
        unrecorded_count: number;
        total_internal: number;
    };
    mealSettings: MealSettings;
    targetDay: TargetDayInfo | null;
    canManageMealSettings: boolean;
};

/** Same rule as MealAllowancePolicy on the server: di hari target, masuk lewat jam mulai atau pulang sebelum jam selesai = dipotong. */
const missesTarget = (targetDay: TargetDayInfo | null, clockIn: string, clockOut: string) =>
    targetDay !== null && ((clockIn !== '' && clockIn > targetDay.start) || (clockOut !== '' && clockOut < targetDay.end));

const allowanceFor = (rule: MealRule, targetDay: TargetDayInfo | null, clockIn: string, clockOut: string) =>
    missesTarget(targetDay, clockIn, clockOut) ? Math.max(0, rule.amount - rule.target_deduction) : rule.amount;

const tierLabel = (tiers: MealTier[], index: number) => {
    const next = tiers[index + 1];
    const from = tiers[index].min_years;

    return next ? `${from}–${next.min_years} th` : `≥ ${from} th`;
};

/** YYYY-MM-DD in the browser's own timezone (toISOString() would give the UTC date). */
const localDateString = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** This page has no field to hang errors on (e.g. "sudah dibayar"), so show them as a toast. */
const showFirstError = (errors: Record<string, string>) => toast.error(Object.values(errors)[0] ?? 'Gagal menyimpan. Coba lagi.');

const WORKING_HOURS_OPTIONS = [9, 10, 11, 12];

export default function AttendanceIndex({ date, rows, summary, mealSettings, targetDay, canManageMealSettings }: AttendanceProps) {

    const changeDate = (newDate: string) => {
        router.get(route('attendances.index'), { date: newDate }, { preserveState: false });
    };

    const prevDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        changeDate(d.toISOString().split('T')[0]);
    };

    const nextDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        changeDate(d.toISOString().split('T')[0]);
    };

    const todayStr = localDateString(new Date());
    const isToday = date === todayStr;

    const [pullingHr, setPullingHr] = useState(false);

    /** Ambil absensi tanggal ini dari HR sekarang juga (menimpa catatan yang belum dibayar). */
    const handlePullHr = () => {
        router.post(
            route('attendances.pull-hr'),
            { date_from: date, date_to: date },
            { preserveScroll: true, onStart: () => setPullingHr(true), onFinish: () => setPullingHr(false), onError: showFirstError },
        );
    };

    const handleBatchPresent = () => {
        router.post(route('attendances.batch'), { date, working_hours: 9 }, { preserveScroll: true, onError: showFirstError });
    };

    return (
        <AppLayout title="Absensi Penjahit" shortTitle="Absensi">
            <Head title="Absensi Penjahit" />

            <PageIntro
                actions={
                    <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto sm:flex-wrap">
                        <Button type="button" variant="outline" size="sm" onClick={prevDay} aria-label="Kemarin">
                            <ChevronLeft className="size-4" />
                            <span className="hidden sm:inline">Kemarin</span>
                        </Button>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => e.target.value && changeDate(e.target.value)}
                            className="h-9 w-full font-medium sm:w-auto"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={nextDay} aria-label="Besok">
                            <span className="hidden sm:inline">Besok</span>
                            <ChevronRight className="size-4" />
                        </Button>
                        {!isToday && (
                            <Button type="button" variant="secondary" size="sm" onClick={() => changeDate(todayStr)} className="col-span-3 sm:col-span-1">
                                Hari Ini
                            </Button>
                        )}
                        <ConfirmAction title="Tarik absensi dari HR?" description={`Catatan tanggal ${date} di OPSEW yang belum dibayar akan diganti dengan data HR.`} confirmLabel="Tarik dari HR" onConfirm={handlePullHr}>
                            <Button type="button" variant="outline" size="sm" disabled={pullingHr} className="col-span-3 sm:col-span-1">
                                <CloudDownload className={cn('size-4', pullingHr && 'animate-pulse')} />
                                {pullingHr ? 'Menarik…' : 'Tarik dari HR'}
                            </Button>
                        </ConfirmAction>
                        <ConfirmAction title="Hadirkan semua penjahit internal?" description={`Tandai hadir ${targetDay ? `${targetDay.start}–${targetDay.end} (hari target)` : '9 jam'} untuk tanggal ${date}. Uang makan mengikuti masa kerja masing-masing.`} confirmLabel="Hadirkan semua" onConfirm={handleBatchPresent}>
                            <Button type="button" size="sm" className="col-span-3 sm:col-span-1">
                                <Sparkles className="size-4" />
                                {targetDay ? 'Hadirkan Semua' : 'Hadirkan Semua (9j)'}
                            </Button>
                        </ConfirmAction>
                    </div>
                }
            />

            <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-3">
                    <StatTile
                        label="Penjahit hadir"
                        value={`${summary.present_count} / ${summary.total_internal}`}
                        hint={[summary.unrecorded_count > 0 ? `${summary.unrecorded_count} belum dicatat` : null, summary.permission_count > 0 ? `${summary.permission_count} izin/sakit` : null].filter(Boolean).join(' · ') || 'Semua sudah dicatat'}
                        icon={UserCheck}
                        tone="done"
                    />
                    <StatTile label="Uang makan hari ini" value={formatIdr(summary.total_allowance)} hint="Masuk ke slip gaji" icon={DollarSign} tone="primary" />
                </div>

                <TargetDayPanel date={date} targetDay={targetDay} settings={mealSettings} />

                <Section
                    title={`Absensi ${formatDate(date)}`}
                    icon={CalendarCheck}
                    description={`Tap status / jam kerja langsung tersimpan. Uang makan per masa kerja: ${mealSettings.tiers.map((tier, index) => `${tierLabel(mealSettings.tiers, index)} ${formatIdr(tier.amount)}`).join(', ')}.`}
                >
                    {rows.length === 0 ? (
                        <EmptyState className="text-base">Tidak ada penjahit internal yang aktif.</EmptyState>
                    ) : (
                        <div className="grid gap-2 lg:grid-cols-2 [&>*]:min-w-0">
                            {rows.map((row) => (
                                <AttendanceCard key={row.tailor_id} row={row} targetDay={targetDay} />
                            ))}
                        </div>
                    )}
                </Section>

                {canManageMealSettings && <MealSettingsPanel settings={mealSettings} />}
            </div>
        </AppLayout>
    );
}

/** Tandai tanggal ini sebagai hari target (wajib hadir dari jam mulai sampai jam selesai) atau batalkan. */
function TargetDayPanel({ date, targetDay, settings }: { date: string; targetDay: TargetDayInfo | null; settings: MealSettings }) {
    const fieldId = useId();
    const [start, setStart] = useState(targetDay?.start ?? settings.target_start);
    const [end, setEnd] = useState(targetDay?.end ?? settings.target_end);
    const [note, setNote] = useState(targetDay?.note ?? '');
    const [busy, setBusy] = useState(false);
    const hooks = { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false), onError: showFirstError };

    const save = () => router.post(route('attendances.target-day.save'), { date, start_time: start, end_time: end, note: note || null }, hooks);

    const remove = () => router.delete(route('attendances.target-day.remove'), { ...hooks, data: { date } });

    return (
        <Card asChild>
            <div className={cn('flex flex-col gap-3 border p-3 sm:flex-row sm:items-end', targetDay ? 'border-amber-300 bg-amber-50/60 dark:bg-amber-950/30' : 'bg-card')}>
                <div className="flex min-w-0 flex-1 items-start gap-2">
                    <Target className={cn('mt-0.5 size-5 shrink-0', targetDay ? 'text-amber-600' : 'text-muted-foreground')} aria-hidden />
                    <div className="min-w-0">
                        <p className="font-bold">{targetDay ? `Hari target ${targetDay.start}–${targetDay.end}` : 'Bukan hari target'}</p>
                        <p className="text-sm text-muted-foreground">
                            {targetDay
                                ? 'Penjahit yang masuk lewat jam mulai atau pulang sebelum jam selesai dipotong uang makannya sesuai masa kerja.'
                                : 'Tandai kalau hari ini penjahit wajib hadir penuh di jam tertentu.'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1">
                        <Label htmlFor={`${fieldId}-start`} className="text-xs font-medium text-muted-foreground">Jam target</Label>
                        <div className="flex items-center gap-1">
                            <Input id={`${fieldId}-start`} type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-28 px-2" aria-label="Jam mulai hari target" />
                            <span className="text-muted-foreground">–</span>
                            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 w-28 px-2" aria-label="Jam selesai hari target" />
                        </div>
                    </div>
                    <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-9 w-40" placeholder="Catatan (opsional)" aria-label="Catatan hari target" />
                    <Button type="button" size="sm" className="h-9" onClick={save} disabled={busy}>
                        <Target className="size-4" />
                        {targetDay ? 'Simpan jam' : 'Jadikan hari target'}
                    </Button>
                    {targetDay && (
                        <ConfirmAction
                            title="Batalkan hari target?"
                            description={`Uang makan tanggal ${date} yang belum dibayar dihitung ulang tanpa potongan hari target.`}
                            confirmLabel="Batalkan hari target"
                            destructive
                            onConfirm={remove}
                        >
                            <Button type="button" variant="ghost" size="sm" className="h-9 text-destructive" disabled={busy}>
                                Batalkan
                            </Button>
                        </ConfirmAction>
                    )}
                </div>
            </div>
        </Card>
    );
}

/** Aturan uang makan per masa kerja + potongan hari target. Disimpan di server, absensi yang belum dibayar ikut dihitung ulang. */
function MealSettingsPanel({ settings }: { settings: MealSettings }) {
    const fieldId = useId();
    const [tiers, setTiers] = useState<MealTier[]>(settings.tiers);
    const [targetStart, setTargetStart] = useState(settings.target_start);
    const [targetEnd, setTargetEnd] = useState(settings.target_end);
    const [busy, setBusy] = useState(false);

    const updateTier = (index: number, key: keyof MealTier, value: string) =>
        setTiers(tiers.map((tier, i) => (i === index ? { ...tier, [key]: value === '' ? 0 : Number(value) } : tier)));

    const save = () =>
        router.put(
            route('attendances.meal-settings'),
            { tiers, target_start: targetStart, target_end: targetEnd },
            { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false), onError: showFirstError },
        );

    return (
        <Section
            title="Aturan uang makan"
            icon={Settings2}
            description="Nominal per hari hadir mengikuti masa kerja (dari tanggal masuk penjahit). Potongan hari target berlaku kalau penjahit tidak hadir penuh di hari target."
        >
            <div className="flex flex-col gap-3">
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-3 py-2">Masa kerja mulai (tahun)</th>
                                <th className="px-3 py-2">Uang makan / hari</th>
                                <th className="px-3 py-2">Potongan hari target</th>
                                <th className="px-3 py-2">
                                    <span className="sr-only">Hapus</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {tiers.map((tier, index) => (
                                <tr key={index}>
                                    <td className="px-3 py-2">
                                        <Input
                                            type="number"
                                            min={0}
                                            step={0.5}
                                            value={tier.min_years}
                                            onChange={(e) => updateTier(index, 'min_years', e.target.value)}
                                            className="h-9 w-24"
                                            disabled={index === 0}
                                            aria-label={`Masa kerja mulai tingkat ${index + 1}`}
                                        />
                                        <span className="mt-1 block text-xs text-muted-foreground">{tierLabel(tiers, index)}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <Input type="number" min={0} step={1000} value={tier.amount} onChange={(e) => updateTier(index, 'amount', e.target.value)} className="h-9 w-32 tabular" aria-label={`Uang makan tingkat ${index + 1}`} />
                                    </td>
                                    <td className="px-3 py-2">
                                        <Input
                                            type="number"
                                            min={0}
                                            step={1000}
                                            value={tier.target_deduction}
                                            onChange={(e) => updateTier(index, 'target_deduction', e.target.value)}
                                            className="h-9 w-32 tabular"
                                            aria-label={`Potongan hari target tingkat ${index + 1}`}
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {index > 0 && (
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setTiers(tiers.filter((_, i) => i !== index))} aria-label={`Hapus tingkat ${index + 1}`}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTiers([...tiers, { min_years: (tiers[tiers.length - 1]?.min_years ?? 0) + 1, amount: tiers[tiers.length - 1]?.amount ?? 0, target_deduction: 0 }])}
                    >
                        <Plus className="size-4" />
                        Tambah tingkat
                    </Button>
                    <div className="flex flex-col gap-1">
                        <Label htmlFor={`${fieldId}-target-start`} className="text-xs font-medium text-muted-foreground">Jam hari target bawaan</Label>
                        <div className="flex items-center gap-1">
                            <Input id={`${fieldId}-target-start`} type="time" value={targetStart} onChange={(e) => setTargetStart(e.target.value)} className="h-9 w-28 px-2" />
                            <span className="text-muted-foreground">–</span>
                            <Input type="time" value={targetEnd} onChange={(e) => setTargetEnd(e.target.value)} className="h-9 w-28 px-2" aria-label="Jam selesai hari target bawaan" />
                        </div>
                    </div>
                    <ConfirmAction
                        title="Simpan aturan uang makan?"
                        description="Uang makan semua absensi yang belum dibayar akan dihitung ulang dengan aturan baru."
                        confirmLabel="Simpan aturan"
                        onConfirm={save}
                    >
                        <Button type="button" size="sm" className="h-9 sm:ml-auto" disabled={busy}>
                            <Save className="size-4" />
                            {busy ? 'Menyimpan…' : 'Simpan aturan'}
                        </Button>
                    </ConfirmAction>
                </div>
            </div>
        </Section>
    );
}

const STATUS_OPTIONS: { value: AttendanceRow['status']; label: string }[] = [
    { value: 'present', label: 'Hadir' },
    { value: 'permission', label: 'Izin' },
    { value: 'sick', label: 'Sakit' },
    { value: 'alpha', label: 'Alpa' },
    { value: 'off', label: 'Libur' },
];

type SaveState = 'idle' | 'saving' | 'saved';

/**
 * One tailor in two rows: name + meal allowance, then status and hours.
 * Status and hours save themselves on tap; clock times, a custom allowance and notes sit behind "Detail".
 */
function AttendanceCard({ row, targetDay }: { row: AttendanceRow; targetDay: TargetDayInfo | null }) {
    const fieldId = useId();
    const [status, setStatus] = useState<AttendanceRow['status']>(row.status);
    const [hours, setHours] = useState(row.working_hours);
    const [clockIn, setClockIn] = useState(row.clock_in ?? '');
    const [clockOut, setClockOut] = useState(row.clock_out ?? '');
    const [mealAllowance, setMealAllowance] = useState(row.meal_allowance ?? allowanceFor(row.meal_rule, targetDay, row.clock_in ?? '', row.clock_out ?? ''));
    const [note, setNote] = useState(row.note ?? '');
    const [showDetail, setShowDetail] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [recorded, setRecorded] = useState(row.is_recorded);
    const isPresent = status === 'present';

    type Values = { status: AttendanceRow['status']; hours: number; mealAllowance: number; clockIn: string; clockOut: string; note: string };

    const save = (changes: Partial<Values> = {}) => {
        const values: Values = { status, hours, mealAllowance, clockIn, clockOut, note, ...changes };
        setSaveState('saving');
        router.post(
            route('attendances.store'),
            {
                tailor_id: row.tailor_id,
                date: row.date,
                status: values.status,
                working_hours: values.hours,
                meal_allowance: values.status === 'present' ? values.mealAllowance : 0,
                clock_in: values.clockIn || null,
                clock_out: values.clockOut || null,
                note: values.note || null,
                quiet: true,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setSaveState('saved');
                    setRecorded(true);
                },
                onError: (errors) => {
                    setSaveState('idle');
                    showFirstError(errors);
                },
            },
        );
    };

    const changeStatus = (value: AttendanceRow['status']) => {
        const allowance = value === 'present' ? allowanceFor(row.meal_rule, targetDay, clockIn, clockOut) : 0;
        setStatus(value);
        setMealAllowance(allowance);
        save({ status: value, mealAllowance: allowance });
    };

    /** Jam kerja dipakai untuk patokan tarif sample; uang makan tidak lagi bergantung jam kerja. */
    const changeHours = (value: number) => {
        setHours(value);
        save({ hours: value });
    };

    /** Jam masuk/pulang bisa memicu potongan hari target, jadi uang makan dihitung ulang sebelum disimpan. */
    const saveDetail = () => {
        const allowance = isPresent ? allowanceFor(row.meal_rule, targetDay, clockIn, clockOut) : 0;
        const changedTimes = clockIn !== (row.clock_in ?? '') || clockOut !== (row.clock_out ?? '');
        const nextAllowance = changedTimes ? allowance : mealAllowance;
        setMealAllowance(nextAllowance);
        save({ mealAllowance: nextAllowance });
    };

    const missedTarget = isPresent && missesTarget(targetDay, clockIn, clockOut);

    return (
        <Card asChild>
            <div className={cn('flex min-w-0 flex-col gap-2 border bg-card p-3 ', !recorded && 'border-dashed')}>
                {/* Row 1: who, allowance, detail toggle */}
                <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{row.tailor_name}</p>
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="truncate">
                                {[row.tailor_code, row.meal_rule.tenure_label ?? 'tgl masuk belum diisi', clockIn && clockOut ? `${clockIn}–${clockOut}` : null, note || null]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                            {row.is_self_clocked && (
                                <Badge variant="secondary" className="bg-emerald-50 text-[11px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                    Portal HP
                                </Badge>
                            )}
                            {!recorded && (
                                <Badge variant="outline" className="border-amber-300 text-[11px] text-amber-600">
                                    Belum dicatat
                                </Badge>
                            )}
                            {missedTarget && (
                                <Badge variant="outline" className="border-destructive/40 text-[11px] text-destructive">
                                    Kurang dari target −{formatIdr(row.meal_rule.target_deduction)}
                                </Badge>
                            )}
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="font-display text-base font-bold tabular">{isPresent ? formatIdr(mealAllowance) : '—'}</p>
                        <p className="text-[11px] text-muted-foreground">
                            {saveState === 'saving' ? 'Menyimpan…' : saveState === 'saved' ? 'Tersimpan ✓' : 'uang makan'}
                        </p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowDetail(!showDetail)} aria-expanded={showDetail} aria-label="Detail" className="px-2">
                        <span className="hidden sm:inline">Detail</span>
                        <ChevronRight className={cn('size-4 transition-transform', showDetail && 'rotate-90')} />
                    </Button>
                </div>

                {/* Row 2: status and hours, saved on tap */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5" role="group" aria-label={`Status ${row.tailor_name}`}>
                        {STATUS_OPTIONS.map((option) => (
                            <Button variant="ghost"
                                key={option.value}
                                type="button"
                                onClick={() => option.value !== status && changeStatus(option.value)}
                                aria-pressed={status === option.value}
                                className={cn('h-auto whitespace-normal',
                                    'rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
                                    status === option.value ? 'bg-primary text-primary-foreground ' : 'text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>
                    {isPresent && (
                        <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5" role="group" aria-label={`Jam kerja ${row.tailor_name}`}>
                            {WORKING_HOURS_OPTIONS.map((option) => (
                                <Button variant="ghost"
                                    key={option}
                                    type="button"
                                    onClick={() => option !== hours && changeHours(option)}
                                    aria-pressed={hours === option}
                                    className={cn('h-auto whitespace-normal',
                                        'rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
                                        hours === option ? 'bg-primary text-primary-foreground ' : 'text-muted-foreground hover:bg-muted',
                                    )}
                                >
                                    {option}j
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                {showDetail && (
                    <div className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-[auto_10rem_1fr_auto] sm:items-end">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor={`${fieldId}-in`} className="text-xs font-medium text-muted-foreground">Masuk — Pulang</Label>
                            <div className="flex items-center gap-1">
                                <Input id={`${fieldId}-in`} aria-label={`Jam masuk ${row.tailor_name}`} type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} className="h-9 w-28 px-2" disabled={!isPresent} />
                                <span className="text-muted-foreground">–</span>
                                <Input id={`${fieldId}-out`} aria-label={`Jam pulang ${row.tailor_name}`} type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} className="h-9 w-28 px-2" disabled={!isPresent} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor={`${fieldId}-meal`} className="text-xs font-medium text-muted-foreground">Uang makan (Rp)</Label>
                            <Input id={`${fieldId}-meal`} type="number" min={0} value={mealAllowance} onChange={(e) => setMealAllowance(Number(e.target.value))} className="h-9 font-semibold tabular" disabled={!isPresent} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor={`${fieldId}-note`} className="text-xs font-medium text-muted-foreground">Catatan</Label>
                            <Input id={`${fieldId}-note`} value={note} onChange={(e) => setNote(e.target.value)} className="h-9" placeholder="Opsional" />
                        </div>
                        <Button type="button" size="sm" className="h-9" onClick={saveDetail} disabled={saveState === 'saving'}>
                            <Save className="size-4" />
                            Simpan detail
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
}
