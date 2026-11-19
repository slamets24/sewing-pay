import { EmptyState } from '@/components/empty-state';
import { DeliveryList } from '@/components/sewing/production/delivery-list';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Section } from '@/components/sewing/section';
import { StatTile } from '@/components/sewing/stat-tile';
import { WorkflowStepper } from '@/components/sewing/workflow-stepper';
import { WorkOrderCard } from '@/components/sewing/work-order/work-order-card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';
import type { BoardRow, DeliveryRecord, WorkOrderSummary } from '@/types/sewing';
import { Link, usePage } from '@inertiajs/react';
import { AlarmClock, BarChart3, ClipboardList, History, Plus, Users } from 'lucide-react';

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
                        <div className="flex shrink-0 flex-wrap items-center gap-2.5 self-start sm:self-center">
                            <Button asChild size="default" variant="outline" className="rounded-xl border-white/40 bg-white/10 text-white font-bold hover:bg-white/20 shadow-xs">
                                <Link href={route('production-reports.index')}>
                                    <BarChart3 className="size-4 mr-1.5" />
                                    Rekap Produksi
                                </Link>
                            </Button>
                            <Button asChild size="default" variant="outline" className="rounded-xl border-white/40 bg-white/10 text-white font-bold hover:bg-white/20 shadow-xs">
                                <Link href={route('work-orders.create')}>
                                    <Plus className="size-4 mr-1.5" />
                                    WO baru
                                </Link>
                            </Button>
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

                {/* The stepper above already shows each stage; only the WO counts are extra. */}
                <div className="grid grid-cols-2 gap-3">
                    <StatTile label="WO berjalan" value={stats.work_orders_open} icon={ClipboardList} tone="primary" href={route('work-orders.index')} />
                    <StatTile
                        label="Lewat deadline"
                        value={stats.work_orders_overdue}
                        icon={AlarmClock}
                        tone={stats.work_orders_overdue > 0 ? 'revision' : 'neutral'}
                        hint="WO belum selesai"
                        href={route('work-orders.index')}
                    />
                </div>

                <Section title="Siapa mengerjakan apa" icon={Users} actions={<SeeAll href={route('deliveries.index')} label="Buka setor" />}>
                    {board.length === 0 ? (
                        <EmptyState>Belum ada penjahit yang memegang barang.</EmptyState>
                    ) : (
                        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {board.map((row) => (
                                <li key={row.tailor.id}>
                                    <Link
                                        href={route('desk.index', { tailor: row.tailor.id })}
                                        className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-foreground/30"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-bold">{row.tailor.name}</p>
                                            <p className="truncate text-sm text-muted-foreground">{[...new Set(row.items.map((item) => item.article_name))].join(', ')}</p>
                                        </div>
                                        {row.tailor.type === 'makloon' && <ToneBadge tone="qc">Makloon</ToneBadge>}
                                        <span className="shrink-0 text-right">
                                            <span className="block font-display text-xl leading-none font-bold text-stage-sewing tabular">{row.remaining_qty}</span>
                                            <span className="text-xs text-muted-foreground">pcs</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
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

                    <Section title="Setoran terakhir" icon={History} actions={<SeeAll href={route('deliveries.index')} label="Semua setoran" />}>
                        <DeliveryList deliveries={recentDeliveries} />
                    </Section>
                </div>
            </div>
        </AppLayout>
    );
}

function SeeAll({ href, label }: { href: string; label: string }) {
    return (
        <Button asChild variant="outline" size="sm">
            <Link href={href}>{label}</Link>
        </Button>
    );
}
