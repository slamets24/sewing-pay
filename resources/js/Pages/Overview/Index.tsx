import { EmptyState } from '@/components/empty-state';
import { DeliveryList } from '@/components/sewing/production/delivery-list';
import { HoldingCard, holdingGridClass } from '@/components/sewing/production/holding-card';
import { Section } from '@/components/sewing/section';
import { StatTile } from '@/components/sewing/stat-tile';
import { WorkflowStepper } from '@/components/sewing/workflow-stepper';
import { WorkOrderCard } from '@/components/sewing/work-order/work-order-card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';
import type { BoardRow, DeliveryRecord, WorkOrderSummary } from '@/types/sewing';
import { Link, usePage } from '@inertiajs/react';
import {
    AlarmClock,
    ClipboardList,
    Factory,
    HandPlatter,
    History,
    PackageCheck,
    Plus,
    Scissors,
    Truck,
    Users,
    Warehouse,
    Wrench,
    type LucideIcon,
} from 'lucide-react';

type OverviewProps = {
    stats: {
        work_orders_open: number;
        work_orders_overdue: number;
        pending_qty: number;
        available_qty: number;
        sewing_qty: number;
        hold_qty: number;
        delivered_today_qty: number;
        unshipped_qty: number;
        revisions_open: number;
    };
    board: BoardRow[];
    dueSoon: WorkOrderSummary[];
    recentDeliveries: DeliveryRecord[];
};

export default function Overview({ stats, board, dueSoon, recentDeliveries }: OverviewProps) {
    const { auth } = usePage<SharedData>().props;
    const firstName = auth.user?.name.split(' ')[0] ?? '';

    return (
        <AppLayout title="Beranda">
            <div className="flex flex-col gap-6">
                {/* Hero Greeting Banner with AZFLOW Gradient (Hireism style) */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4F57F5] via-[#5D53FA] to-[#7A4DF7] p-6 text-white shadow-sm">
                    <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase text-white backdrop-blur-xs">
                                    OPSEW · Divisi Jahit & Gudang
                                </span>
                                <span className="text-[11px] font-medium text-white/80">
                                    powered by AZFLOW
                                </span>
                            </div>
                            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                                Halo, {firstName} 👋
                            </h2>
                            <p className="max-w-xl text-sm leading-relaxed text-white/90">
                                Hari ini ada <strong className="font-bold underline decoration-white/50">{board.length} penjahit aktif</strong> memegang kain. Sebanyak <strong>{stats.available_qty} pcs</strong> potongan siap diambil di gudang.
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5 self-start sm:self-center">
                            <Button asChild size="default" className="rounded-xl bg-white text-primary font-bold hover:bg-white/90 shadow-xs border-0">
                                <Link href={route('desk.index')}>
                                    Buka Meja Loket
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <div className="pointer-events-none absolute -right-6 -bottom-10 size-44 rounded-full bg-white/10 blur-2xl" />
                </div>

                {/* Visual Workflow Stepper */}
                <WorkflowStepper stats={stats} />

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <QuickAction href={route('work-orders.create')} icon={Plus} label="WO baru" />
                    <QuickAction href={route('pickups.create')} icon={HandPlatter} label="Ambil barang" />
                    <QuickAction href={route('deliveries.index')} icon={PackageCheck} label="Setor jahitan" />
                    <QuickAction href={route('qc-shipments.index')} icon={Truck} label="Kirim ke QC" />
                    <QuickAction href={route('revisions.index')} icon={Wrench} label="Catat revisi" />
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile label="Di divisi lain" value={`${stats.pending_qty} pcs`} icon={Factory} tone="other" hint="Masih di print / cutting" href={route('work-orders.index')} />
                    <StatTile label="Siap diambil" value={`${stats.available_qty} pcs`} icon={Warehouse} tone="ready" hint="Ada di gudang jahit" href={route('pickups.create')} />
                    <StatTile label="Sedang dijahit" value={`${stats.sewing_qty} pcs`} icon={Scissors} tone="sewing" hint={`${board.length} penjahit memegang`} href={route('deliveries.index')} />
                    <StatTile label="Setor hari ini" value={`${stats.delivered_today_qty} pcs`} icon={PackageCheck} tone="done" href={route('deliveries.index')} />
                    <StatTile label="WO berjalan" value={stats.work_orders_open} icon={ClipboardList} tone="primary" href={route('work-orders.index')} />
                    <StatTile
                        label="Lewat deadline"
                        value={stats.work_orders_overdue}
                        icon={AlarmClock}
                        tone={stats.work_orders_overdue > 0 ? 'revision' : 'neutral'}
                        hint="WO belum selesai"
                        href={route('work-orders.index')}
                    />
                    <StatTile label="Belum dikirim QC" value={`${stats.unshipped_qty} pcs`} icon={Truck} tone="qc" hint="Siap kirim ke QC" href={route('qc-shipments.index')} />
                    <StatTile label="Revisi terbuka" value={stats.revisions_open} icon={Wrench} tone="revision" hint={stats.hold_qty > 0 ? `${stats.hold_qty} pcs ditahan di gudang` : undefined} href={route('revisions.index')} />
                </div>

                <Section title="Siapa mengerjakan apa" icon={Users} actions={<SeeAll href={route('deliveries.index')} label="Buka setor" />}>
                    {board.length === 0 ? (
                        <EmptyState>Belum ada penjahit yang memegang barang.</EmptyState>
                    ) : (
                        <div className={holdingGridClass()}>
                            {board.map((row) => (
                                <HoldingCard key={row.tailor.id} row={row} />
                            ))}
                        </div>
                    )}
                </Section>

                <div className="grid gap-5 lg:grid-cols-2">
                    <Section title="Deadline dekat" icon={AlarmClock} description="Lewat deadline atau jatuh tempo 3 hari ke depan." actions={<SeeAll href={route('work-orders.index')} label="Semua WO" />}>
                        {dueSoon.length === 0 ? (
                            <EmptyState>Tidak ada WO yang mendesak.</EmptyState>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {dueSoon.map((workOrder) => (
                                    <WorkOrderCard key={workOrder.id} workOrder={workOrder} compact />
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section title="Setoran terakhir" icon={History}>
                        <DeliveryList deliveries={recentDeliveries} />
                    </Section>
                </div>
            </div>
        </AppLayout>
    );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
    return (
        <Link
            href={href}
            className="surface-card flex min-h-[4.5rem] flex-col items-center justify-center gap-2 px-3 py-3.5 text-center text-sm font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" strokeWidth={2} />
            </span>
            {label}
        </Link>
    );
}

function SeeAll({ href, label }: { href: string; label: string }) {
    return (
        <Button asChild variant="outline" size="sm">
            <Link href={href}>{label}</Link>
        </Button>
    );
}
