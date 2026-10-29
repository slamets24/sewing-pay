import { EmptyState } from '@/components/empty-state';
import { PageIntro, Section } from '@/components/sewing/section';
import { StatTile } from '@/components/sewing/stat-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { formatIdr } from '@/lib/format';
import { Head, router } from '@inertiajs/react';
import {
    CalendarCheck,
    ChevronLeft,
    ChevronRight,
    Clock,
    DollarSign,
    Save,
    Sparkles,
    UserCheck,
    UserX,
} from 'lucide-react';
import { useState } from 'react';

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
};

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
    mealAllowanceRules?: {
        under_10_hours: number;
        ten_hours_or_more: number;
    };
};

const STATUS_LABELS: Record<string, string> = {
    present: 'Hadir',
    permission: 'Izin',
    sick: 'Sakit',
    alpha: 'Alpa',
    off: 'Libur',
};

const WORKING_HOURS_OPTIONS = [9, 10, 11, 12];

export default function AttendanceIndex({ date, rows, summary }: AttendanceProps) {
    const [submittingId, setSubmittingId] = useState<number | null>(null);

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

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = date === todayStr;

    const handleBatchPresent = () => {
        if (!confirm(`Tandai semua penjahit internal hadir 9 jam (uang makan Rp 30.000) untuk tanggal ${date}?`)) {
            return;
        }

        router.post(route('attendances.batch'), { date, working_hours: 9 }, { preserveScroll: true });
    };

    return (
        <AppLayout title="Absensi Penjahit">
            <Head title="Absensi Penjahit" />

            <PageIntro
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={prevDay}>
                            <ChevronLeft className="size-4" />
                            Kemarin
                        </Button>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => e.target.value && changeDate(e.target.value)}
                            className="w-auto h-9 font-medium"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={nextDay}>
                            Besok
                            <ChevronRight className="size-4" />
                        </Button>
                        {!isToday && (
                            <Button type="button" variant="secondary" size="sm" onClick={() => changeDate(todayStr)}>
                                Hari Ini
                            </Button>
                        )}
                        <Button type="button" size="sm" onClick={handleBatchPresent}>
                            <Sparkles className="size-4" />
                            Hadirkan Semua (9j)
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile
                        label="Penjahit Hadir"
                        value={`${summary.present_count} / ${summary.total_internal}`}
                        hint={`${summary.unrecorded_count} belum dicatat`}
                        icon={UserCheck}
                        tone="done"
                    />
                    <StatTile
                        label="Total Uang Makan Hari Ini"
                        value={formatIdr(summary.total_allowance)}
                        hint="Diakumulasi ke slip gaji"
                        icon={DollarSign}
                        tone="primary"
                    />
                    <StatTile
                        label="Izin / Sakit"
                        value={summary.permission_count}
                        hint="Tidak dapat uang makan"
                        icon={UserX}
                        tone="other"
                    />
                    <StatTile
                        label="Aturan Uang Makan"
                        value="30rb / 35rb"
                        hint="<10j: Rp 30.000 · ≥10j: Rp 35.000"
                        icon={Clock}
                        tone="sewing"
                    />
                </div>

                <Section
                    title={`Daftar Absensi Penjahit (${date})`}
                    icon={CalendarCheck}
                    description="Karyawan juga bisa melakukan absen masuk & pulang secara mandiri lewat portal masing-masing."
                >
                    {rows.length === 0 ? (
                        <EmptyState className="text-base">Tidak ada penjahit internal yang aktif.</EmptyState>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {rows.map((row) => (
                                <AttendanceCard
                                    key={row.tailor_id}
                                    row={row}
                                    isSubmitting={submittingId === row.tailor_id}
                                    setSubmittingId={setSubmittingId}
                                />
                            ))}
                        </div>
                    )}
                </Section>
            </div>
        </AppLayout>
    );
}

function AttendanceCard({
    row,
    isSubmitting,
    setSubmittingId,
}: {
    row: AttendanceRow;
    isSubmitting: boolean;
    setSubmittingId: (id: number | null) => void;
}) {
    const [status, setStatus] = useState<AttendanceRow['status']>(row.status);
    const [clockIn, setClockIn] = useState(row.clock_in ?? '');
    const [clockOut, setClockOut] = useState(row.clock_out ?? '');
    const [hours, setHours] = useState(row.working_hours);
    const isPresent = status === 'present';
    const defaultAllowance = isPresent ? (hours >= 10 ? 35000 : 30000) : 0;
    const [mealAllowance, setMealAllowance] = useState(row.meal_allowance ?? defaultAllowance);
    const [note, setNote] = useState(row.note);

    const handleHoursChange = (opt: number) => {
        setHours(opt);
        if (isPresent) {
            setMealAllowance(opt >= 10 ? 35000 : 30000);
        }
    };

    const handleStatusChange = (val: AttendanceRow['status']) => {
        setStatus(val);
        if (val !== 'present') {
            setMealAllowance(0);
        } else {
            setMealAllowance(hours >= 10 ? 35000 : 30000);
        }
    };

    const handleSave = () => {
        setSubmittingId(row.tailor_id);
        router.post(
            route('attendances.store'),
            {
                tailor_id: row.tailor_id,
                date: row.date,
                status,
                clock_in: clockIn,
                clock_out: clockOut,
                working_hours: hours,
                meal_allowance: mealAllowance,
                note,
            },
            {
                preserveScroll: true,
                onFinish: () => setSubmittingId(null),
            }
        );
    };

    return (
        <div className="rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 md:w-1/4">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-base truncate">{row.tailor_name}</p>
                        {row.is_self_clocked && (
                            <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                Portal HP
                            </Badge>
                        )}
                        {!row.is_recorded && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                Belum Absen
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">{row.tailor_code ?? 'Internal'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:flex-1 md:items-center">
                    {/* Status */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Status</label>
                        <Select value={status} onValueChange={(val) => handleStatusChange(val as AttendanceRow['status'])}>
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(STATUS_LABELS).map(([k, label]) => (
                                    <SelectItem key={k} value={k}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Jam Masuk & Pulang */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Masuk — Pulang</label>
                        <div className="flex items-center gap-1">
                            <Input
                                type="time"
                                value={clockIn}
                                onChange={(e) => setClockIn(e.target.value)}
                                className="h-9 px-2 text-xs"
                                disabled={!isPresent}
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                                type="time"
                                value={clockOut}
                                onChange={(e) => setClockOut(e.target.value)}
                                className="h-9 px-2 text-xs"
                                disabled={!isPresent}
                            />
                        </div>
                    </div>

                    {/* Shift Jam Kerja */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Jam Kerja</label>
                        <div className="flex gap-1">
                            {WORKING_HOURS_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleHoursChange(opt)}
                                    disabled={!isPresent}
                                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold border transition-all ${
                                        hours === opt && isPresent
                                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                            : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {opt}j
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Uang Makan Riil (Bisa diedit/custom) */}
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground">Uang Makan (Rp)</label>
                            <span className="text-[10px] text-muted-foreground">
                                {hours >= 10 ? '≥10j: 35rb' : '<10j: 30rb'}
                            </span>
                        </div>
                        <Input
                            type="number"
                            value={mealAllowance}
                            onChange={(e) => setMealAllowance(Number(e.target.value))}
                            className="h-9 px-2 text-sm font-semibold"
                            disabled={!isPresent}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 pt-2 md:pt-0 md:pl-2">
                    <Input
                        placeholder="Catatan..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="h-9 text-xs md:w-36"
                    />
                    <Button type="button" size="sm" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? <Clock className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Simpan
                    </Button>
                </div>
            </div>
        </div>
    );
}
