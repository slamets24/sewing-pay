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
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div>
                        <p className="text-3xl font-bold tracking-tight">Halo, {firstName}</p>
                        <p className="text-base text-muted-foreground">Panel operasional internal divisi jahit hari ini.</p>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">
                        {board.length} penjahit aktif memegang kain
                    </span>
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
            className="surface-card flex min-h-[4.75rem] flex-col items-center justify-center gap-2 px-3 py-4 text-center text-sm font-semibold text-foreground transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft-lg)] focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" strokeWidth={1.75} />
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
