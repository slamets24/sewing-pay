import { AppLogo } from '@/components/app-logo';
import { FlashToaster } from '@/components/flash-toaster';
import { DeliveryList, HoldingList, PortalSlipList, RevisionList, type PortalSlip } from '@/components/sewing/payout/portal-lists';
import { DisplaySettings } from '@/components/sewing/display-settings';
import { Section } from '@/components/sewing/section';
import { StatTile } from '@/components/sewing/stat-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TailorPortal } from '@/domain/payout/tailor-portal';
import { formatIdr, joinMeta } from '@/lib/format';
import type { DeliveryRecord, PickupItemRecord, RevisionRecord, TailorRecord } from '@/types/sewing';
import { Head, router } from '@inertiajs/react';
import {
    CalendarCheck,
    Clock,
    DollarSign,
    Lock,
    LogIn,
    LogOut,
    PackageCheck,
    Receipt,
    Scissors,
    Shirt,
    Wallet,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';

type AttendanceInfo = {
    id: number;
    date: string;
    clock_in: string | null;
    clock_out: string | null;
    working_hours: number;
    meal_allowance: number;
    status: string;
    is_self_clocked?: boolean;
};

type RecentAttendanceItem = {
    id: number;
    date: string;
    date_label: string;
    clock_in: string | null;
    clock_out: string | null;
    working_hours: number;
    meal_allowance: number;
    status: string;
};

type PortalProps = {
    tailor: TailorRecord;
    lock_url: string;
    clock_url: string;
    todayAttendance: AttendanceInfo | null;
    recentAttendances: RecentAttendanceItem[];
    holding: PickupItemRecord[];
    unpaid: { qty: number; amount: number };
    recentDeliveries: DeliveryRecord[];
    openRevisions: RevisionRecord[];
    slips: PortalSlip[];
};

export default function PortalIndex(props: PortalProps) {
    return (
        <div className="min-h-screen bg-background">
            <Head title="Pekerjaan saya" />
            <header className="sticky top-0 z-30 border-b border-border/60 bg-card/95 backdrop-blur-md">
                <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
                    <AppLogo subtitle="Portal penjahit" />
                    <div className="ml-auto flex items-center gap-2">
                        <DisplaySettings />
                        <Button type="button" variant="outline" onClick={() => router.post(props.lock_url)}>
                            <Lock />
                            Kunci
                        </Button>
                    </div>
                </div>
            </header>
            <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
                <PortalContent {...props} />
            </main>
            <FlashToaster />
        </div>
    );
}

function PortalContent({
    tailor,
    clock_url,
    todayAttendance,
    recentAttendances,
    holding,
    unpaid,
    recentDeliveries,
    openRevisions,
    slips,
}: Omit<PortalProps, 'lock_url'>) {
    const portal = new TailorPortal(tailor, holding, recentDeliveries, openRevisions);
    const isInternal = tailor.type === 'internal';

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
                <p className="font-display text-3xl leading-tight font-bold break-words">
                    {TailorPortal.greeting()}, {tailor.name}
                </p>
                <p className="text-base text-muted-foreground">{joinMeta(tailor.code, tailor.type_label)}</p>
            </div>

            {/* Attendance Clock In / Out for Internal Tailor */}
            {isInternal && (
                <TailorClockCard
                    clockUrl={clock_url}
                    attendance={todayAttendance}
                    recentAttendances={recentAttendances}
                />
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatTile label="Sedang saya jahit" value={portal.holdingQty} hint={`pcs, dari ${holding.length} barang`} icon={Scissors} tone="sewing" />
                <StatTile label="Revisi terbuka" value={openRevisions.length} hint={`${portal.openRevisionQty} pcs`} icon={Wrench} tone="revision" />
                <div className="col-span-2 lg:col-span-1">
                    {portal.showsMoney ? (
                        <StatTile label="Belum dibayar" value={formatIdr(unpaid.amount)} hint={`${unpaid.qty} pcs, masuk pencairan berikutnya`} icon={Wallet} tone="primary" />
                    ) : (
                        <StatTile label="Sudah disetor" value={portal.recentDeliveredQty} hint="pcs, dari setoran terakhir" icon={PackageCheck} tone="done" />
                    )}
                </div>
            </div>

            <Section title="Barang yang saya pegang" icon={Shirt}>
                <HoldingList items={holding} />
            </Section>

            <Section title="Revisi saya" icon={Wrench}>
                <RevisionList revisions={openRevisions} />
            </Section>

            <Section title="Setoran terakhir" icon={PackageCheck}>
                <DeliveryList deliveries={recentDeliveries} showMoney={portal.showsMoney} />
            </Section>

            {(portal.showsMoney || slips.length > 0) && (
                <Section title="Slip gaji saya" icon={Receipt}>
                    <PortalSlipList slips={slips} />
                </Section>
            )}
        </div>
    );
}

function TailorClockCard({
    clockUrl,
    attendance,
    recentAttendances,
}: {
    clockUrl: string;
    attendance: AttendanceInfo | null;
    recentAttendances: RecentAttendanceItem[];
}) {
    const [clocking, setClocking] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const handleClock = () => {
        setClocking(true);
        router.post(clockUrl, {}, {
            preserveScroll: true,
            onFinish: () => setClocking(false),
        });
    };

    const hasClockIn = attendance !== null && Boolean(attendance.clock_in);
    const hasClockOut = attendance !== null && Boolean(attendance.clock_out);

    return (
        <div className="overflow-hidden rounded-xl border border-primary/20 bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CalendarCheck className="size-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-display text-lg font-bold">Absensi Hari Ini</h3>
                            {!hasClockIn && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                    Belum Absen
                                </Badge>
                            )}
                            {hasClockIn && !hasClockOut && (
                                <Badge className="bg-emerald-600 text-white animate-pulse">
                                    Sedang Bekerja
                                </Badge>
                            )}
                            {hasClockOut && (
                                <Badge className="bg-blue-600 text-white">
                                    Selesai Bekerja
                                </Badge>
                            )}
                        </div>

                        {/* Status text */}
                        {!hasClockIn && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                Silakan tekan tombol absen masuk saat Anda tiba di tempat jahit.
                            </p>
                        )}
                        {hasClockIn && !hasClockOut && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                Masuk pukul <strong className="text-foreground">{attendance.clock_in}</strong>. Tekan absen pulang saat selesai bekerja.
                            </p>
                        )}
                        {hasClockOut && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                Masuk pukul <strong>{attendance.clock_in}</strong> — Pulang pukul <strong>{attendance.clock_out}</strong> ({attendance.working_hours} Jam kerja).
                            </p>
                        )}
                    </div>
                </div>

                {/* Action button */}
                <div className="flex flex-col sm:items-end gap-2">
                    {!hasClockIn && (
                        <Button
                            type="button"
                            size="lg"
                            onClick={handleClock}
                            disabled={clocking}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base px-6 h-12 shadow-md"
                        >
                            <LogIn className="size-5 mr-1" />
                            {clocking ? 'Mencatat...' : 'Absen Masuk'}
                        </Button>
                    )}

                    {hasClockIn && !hasClockOut && (
                        <Button
                            type="button"
                            size="lg"
                            variant="destructive"
                            onClick={handleClock}
                            disabled={clocking}
                            className="font-semibold text-base px-6 h-12 shadow-md"
                        >
                            <LogOut className="size-5 mr-1" />
                            {clocking ? 'Mencatat...' : 'Absen Pulang'}
                        </Button>
                    )}

                    {hasClockOut && (
                        <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-2 text-right">
                            <DollarSign className="size-5 text-emerald-600" />
                            <div>
                                <p className="text-xs text-muted-foreground">Uang makan hari ini</p>
                                <p className="text-base font-bold text-foreground">
                                    {formatIdr(attendance.meal_allowance)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Expandable History toggle */}
            {recentAttendances.length > 0 && (
                <div className="mt-4 border-t pt-3">
                    <button
                        type="button"
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                        <Clock className="size-3.5" />
                        {showHistory ? 'Sembunyikan Riwayat Absensi' : `Lihat Riwayat Absensi (${recentAttendances.length} hari terakhir)`}
                    </button>

                    {showHistory && (
                        <ul className="mt-3 flex flex-col gap-2">
                            {recentAttendances.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-xs"
                                >
                                    <div>
                                        <span className="font-semibold">{item.date_label}</span>
                                        <span className="ml-2 text-muted-foreground">
                                            {item.clock_in ? `${item.clock_in} – ${item.clock_out ?? '?'}` : item.status}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                            {formatIdr(item.meal_allowance)}
                                        </span>
                                        <span className="ml-1 text-muted-foreground">({item.working_hours}j)</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
