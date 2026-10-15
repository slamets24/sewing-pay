import { EmptyState } from '@/components/empty-state';
import { QtyBar } from '@/components/sewing/qty-bar';
import { PageIntro } from '@/components/sewing/section';
import { WorkOrderCard } from '@/components/sewing/work-order/work-order-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { WorkOrderSummary } from '@/types/sewing';
import { Link, router } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type IndexProps = {
    filters: { status: 'open' | 'done' | 'all'; search: string };
    workOrders: WorkOrderSummary[];
};

const STATUS_FILTERS = [
    { value: 'open', label: 'Berjalan' },
    { value: 'done', label: 'Selesai jahit' },
    { value: 'all', label: 'Semua' },
] as const;

export default function WorkOrderIndex({ filters, workOrders }: IndexProps) {
    const [search, setSearch] = useState(filters.search);

    const visit = (params: Partial<IndexProps['filters']>) =>
        router.get(route('work-orders.index'), { ...filters, ...params }, { preserveState: true, preserveScroll: true, replace: true });

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();
        visit({ search });
    };

    const totals = workOrders.reduce(
        (sum, workOrder) => ({
            pending_qty: sum.pending_qty + workOrder.pending_qty,
            available_qty: sum.available_qty + workOrder.available_qty,
            sewing_qty: sum.sewing_qty + workOrder.sewing_qty,
            hold_qty: sum.hold_qty + workOrder.hold_qty,
            delivered_qty: sum.delivered_qty + workOrder.delivered_qty,
        }),
        { pending_qty: 0, available_qty: 0, sewing_qty: 0, hold_qty: 0, delivered_qty: 0 },
    );

    return (
        <AppLayout title="Work order">
            <PageIntro
                actions={
                    <Button asChild size="lg">
                        <Link href={route('work-orders.create')}>
                            <Plus />
                            WO baru
                        </Link>
                    </Button>
                }
            >
                Semua WO beserta posisi barangnya: di divisi lain, di gudang, dijahit, atau selesai.
            </PageIntro>

            <div className="mb-5 flex flex-col gap-3 rounded-lg border bg-card p-4">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Saring status">
                    {STATUS_FILTERS.map((option) => (
                        <Button key={option.value} variant={filters.status === option.value ? 'default' : 'outline'} onClick={() => visit({ status: option.value })}>
                            {option.label}
                        </Button>
                    ))}
                </div>
                <form onSubmit={submitSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor WO atau artikel…" className="pl-10" />
                    </div>
                    <Button type="submit" variant="secondary">
                        Cari
                    </Button>
                </form>
                <QtyBar breakdown={totals} showLegend />
            </div>

            {workOrders.length === 0 ? (
                <EmptyState className="bg-card py-10 text-base">
                    Belum ada WO {filters.status === 'open' ? 'yang berjalan' : ''}.
                    <Button asChild>
                        <Link href={route('work-orders.create')}>
                            <Plus />
                            Buat WO
                        </Link>
                    </Button>
                </EmptyState>
            ) : (
                <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3')}>
                    {workOrders.map((workOrder) => (
                        <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
                    ))}
                </div>
            )}
        </AppLayout>
    );
}
