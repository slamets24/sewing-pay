import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { QtyBar } from '@/components/sewing/qty-bar';
import { PageIntro } from '@/components/sewing/section';
import { WaReportButton } from '@/components/sewing/work-order/wa-report-button';
import { WorkOrderCard } from '@/components/sewing/work-order/work-order-card';
import { workOrdersWaText } from '@/domain/work-order/wa-report';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { useCan } from '@/lib/abilities';
import { cn } from '@/lib/utils';
import type { WorkOrderSummary } from '@/types/sewing';
import { Link, router, usePoll } from '@inertiajs/react';
import { PlugZap, Plus, RefreshCw, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type IndexProps = {
    filters: { status: 'open' | 'done' | 'all'; search: string };
    workOrders: WorkOrderSummary[];
    packingConfigured: boolean;
};

const STATUS_FILTERS = [
    { value: 'open', label: 'Berjalan' },
    { value: 'done', label: 'Selesai jahit' },
    { value: 'all', label: 'Semua' },
] as const;

export default function WorkOrderIndex({ filters, workOrders, packingConfigured }: IndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [pulling, setPulling] = useState(false);
    const canManage = useCan()('work-orders.manage');

    // WO dari Packing (baru / diubah / dinonaktifkan) ikut muncul sendiri tiap 30 detik tanpa reload halaman.
    usePoll(30000, { only: ['workOrders'] });

    const pullFromPacking = () =>
        router.post(
            route('work-orders.pull-packing'),
            {},
            { preserveScroll: true, onStart: () => setPulling(true), onFinish: () => setPulling(false) },
        );

    const visit = (params: Partial<IndexProps['filters']>) =>
        router.get(route('work-orders.index'), { ...filters, ...params }, { preserveState: true, preserveScroll: true, replace: true });

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();
        visit({ search });
    };

    const totals = workOrders.reduce(
        (sum, workOrder) => ({
            printing_qty: sum.printing_qty + workOrder.printing_qty,
            cutting_qty: sum.cutting_qty + workOrder.cutting_qty,
            available_qty: sum.available_qty + workOrder.available_qty,
            sewing_internal_qty: sum.sewing_internal_qty + workOrder.sewing_internal_qty,
            sewing_makloon_qty: sum.sewing_makloon_qty + workOrder.sewing_makloon_qty,
            sewing_qty: sum.sewing_qty + workOrder.sewing_qty,
            hold_qty: sum.hold_qty + workOrder.hold_qty,
            delivered_qty: sum.delivered_qty + workOrder.delivered_qty,
            qc_qty: sum.qc_qty + workOrder.qc_qty,
        }),
        { printing_qty: 0, cutting_qty: 0, available_qty: 0, sewing_internal_qty: 0, sewing_makloon_qty: 0, sewing_qty: 0, hold_qty: 0, delivered_qty: 0, qc_qty: 0 },
    );

    return (
        <AppLayout title="Work order">
            <PageIntro
                actions={
                    <div className="flex flex-wrap gap-2">
                        <WaReportButton
                            size="lg"
                            label={`Laporan WA (${workOrders.length})`}
                            disabled={workOrders.length === 0}
                            text={workOrdersWaText(workOrders, filters.status === 'done' ? 'Laporan WO selesai jahit' : filters.status === 'all' ? 'Laporan WO' : 'Laporan WO berjalan')}
                        />
                        {canManage && packingConfigured && (
                            <Button size="lg" variant="outline" onClick={pullFromPacking} disabled={pulling}>
                                <RefreshCw className={cn(pulling && 'animate-spin')} />
                                {pulling ? 'Menarik WO…' : 'Tarik dari Packing'}
                            </Button>
                        )}
                        {canManage && (
                            <Button size="lg" variant="ghost" onClick={() => router.post(route('connections.test-packing'), {}, { preserveScroll: true })}>
                                <PlugZap />
                                Tes koneksi Packing
                            </Button>
                        )}
                        {canManage && (
                            <Button asChild size="lg">
                                <Link href={route('work-orders.create')}>
                                    <Plus />
                                    WO baru
                                </Link>
                            </Button>
                        )}
                    </div>
                }
            />

            <Card asChild>
                <div className="mb-6 flex flex-col gap-4 border border-border bg-card p-4 sm:p-5 ">
                    {/* HP: satu baris tiga tombol sama lebar; laptop: tombol biasa. */}
                    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap" role="group" aria-label="Saring status">
                        {STATUS_FILTERS.map((option) => (
                            <Button
                                key={option.value}
                                variant={filters.status === option.value ? 'default' : 'outline'}
                                onClick={() => visit({ status: option.value })}
                                aria-pressed={filters.status === option.value}
                                className=" px-2 font-semibold transition-all sm:px-4"
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>
                    <form onSubmit={submitSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Cari nomor WO atau nama artikel…"
                                className="h-11 pl-10 pr-4 text-base "
                            />
                        </div>
                        <Button type="submit" variant="secondary" className="h-11 px-5 font-semibold ">
                            Cari
                        </Button>
                    </form>
                    <QtyBar breakdown={totals} showLegend />
                </div>
            </Card>

            {workOrders.length === 0 ? (
                <EmptyState className="bg-card py-10 text-base">
                    Belum ada WO {filters.status === 'open' ? 'yang berjalan' : ''}.
                    {canManage && (
                        <Button asChild>
                            <Link href={route('work-orders.create')}>
                                <Plus />
                                Buat WO
                            </Link>
                        </Button>
                    )}
                </EmptyState>
            ) : (
                <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3')}>
                    {workOrders.map((workOrder) => (
                        <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
                    ))}
                </div>
            )}
        </AppLayout>
    );
}
