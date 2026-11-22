import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/empty-state';
import { ReassignRevisionSheet } from '@/components/sewing/desk/defect-sheets';
import { DeskHoldingLine, DeskItemRow } from '@/components/sewing/desk/desk-lines';
import { DeskRecentDeliveries, OtherTailorRevisions, TailorMetrics } from '@/components/sewing/desk/desk-panels';
import { PageIntro } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PickupCart } from '@/domain/production/pickup-cart';
import AppLayout from '@/layouts/app-layout';
import { dueLabel, variantLabel } from '@/lib/format';
import { ToneStyle } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { floorActions, FloorActions } from '@/services/floor-actions';
import type { BoardRow, DeliveryRecord, RevisionPartRecord, RevisionRecord, TailorRecord, WorkOrderItemRecord } from '@/types/sewing';
import { Link, router } from '@inertiajs/react';
import {
    ArrowLeftRight,
    BarChart3,
    Check,
    ClipboardList,
    Ellipsis,
    HandPlatter,
    Package,
    PackageCheck,
    Search,
    Shirt,
    ShoppingBasket,
    TriangleAlert,
    UserRound,
    Warehouse,
    X,
    Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type DeskProps = {
    tailors: TailorRecord[];
    board: BoardRow[];
    availableItems: WorkOrderItemRecord[];
    presetTailorId: number | null;
    recentDeliveries: DeliveryRecord[];
    openRevisions?: RevisionRecord[];
    revisionParts?: RevisionPartRecord[];
};

type TailorFilter = 'all' | 'holding' | 'revisions' | 'today';

export default function DeskIndex({
    tailors,
    board,
    availableItems,
    presetTailorId,
    recentDeliveries,
    openRevisions = [],
    revisionParts = [],
}: DeskProps) {
    const [selectedTailorId, setSelectedTailorId] = useState<number | null>(() => presetTailorId ?? null);
    const [tailorSearch, setTailorSearch] = useState('');
    const [tailorFilter, setTailorFilter] = useState<TailorFilter>('all');
    const [itemQuery, setItemQuery] = useState('');
    const [batchBusy, setBatchBusy] = useState(false);
    const [pickupBusy, setPickupBusy] = useState(false);
    const [mobileTab, setMobileTab] = useState<'setor' | 'ambil'>('setor');

    // Selected Tailor
    const selectedTailor = useMemo(() => tailors.find((t) => t.id === selectedTailorId) ?? null, [tailors, selectedTailorId]);

    // Board row for selected tailor (items currently held)
    const tailorBoardRow = useMemo(() => board.find((row) => row.tailor.id === selectedTailorId) ?? null, [board, selectedTailorId]);

    // Active revisions for selected tailor
    const tailorRevisions = useMemo(
        () => (selectedTailorId ? openRevisions.filter((r) => r.tailor_id === selectedTailorId) : []),
        [openRevisions, selectedTailorId],
    );

    const totalRevisionQty = useMemo(() => tailorRevisions.reduce((sum, r) => sum + r.qty, 0), [tailorRevisions]);

    // Revisions that need desk action (waiting material or material ready at desk to be started).
    // In-progress revisions have moved to the tailor and appear in "1. Setor Jahitan Jadi".
    const deskPendingRevisions = useMemo(
        () =>
            tailorRevisions.filter(
                (r) => r.status === 'waiting_material' || r.status === 'material_ready' || (r.status === 'in_progress' && !r.pickup_item_id),
            ),
        [tailorRevisions],
    );

    const deskPendingRevisionQty = useMemo(() => deskPendingRevisions.reduce((sum, r) => sum + r.qty, 0), [deskPendingRevisions]);

    // Revisions from other tailors that are eligible to be reassigned / taken by this tailor
    const otherTailorRevisions = useMemo(() => {
        if (!selectedTailorId) return [];
        return openRevisions.filter((r) => r.tailor_id !== selectedTailorId && r.can_change_tailor);
    }, [openRevisions, selectedTailorId]);

    // Pickup Cart for the selected tailor
    const [cart, setCart] = useState(() => PickupCart.start(selectedTailor));

    // When selected tailor changes, reset cart with that tailor
    useEffect(() => {
        setCart((current) => (current.tailor?.id === selectedTailor?.id ? current.syncWith(availableItems) : PickupCart.start(selectedTailor)));
        // If tailor has no items to deliver, default mobile tab to 'ambil'
        const delivQty = tailorBoardRow?.deliverable_qty ?? tailorBoardRow?.remaining_qty ?? 0;
        if (selectedTailor && delivQty === 0) {
            setMobileTab('ambil');
        } else {
            setMobileTab('setor');
        }
    }, [selectedTailor, availableItems, tailorBoardRow]);

    // Filter counts
    const holdingTailorsCount = useMemo(() => tailors.filter((t) => (t.holding_qty ?? 0) > 0).length, [tailors]);
    const revisionTailorsCount = useMemo(() => tailors.filter((t) => (t.revisions_count ?? 0) > 0).length, [tailors]);
    const todayTailorsCount = useMemo(() => tailors.filter((t) => (t.today_delivered_qty ?? 0) > 0).length, [tailors]);

    // Filtered tailors for selection
    const filteredTailors = useMemo(() => {
        const needle = tailorSearch.toLowerCase().trim();
        let list = tailors;

        if (tailorFilter === 'holding') {
            list = list.filter((t) => (t.holding_qty ?? 0) > 0);
        } else if (tailorFilter === 'revisions') {
            list = list.filter((t) => (t.revisions_count ?? 0) > 0);
        } else if (tailorFilter === 'today') {
            list = list.filter((t) => (t.today_delivered_qty ?? 0) > 0);
        }

        if (needle) {
            list = list.filter((t) => `${t.name} ${t.code ?? ''}`.toLowerCase().includes(needle));
        }

        return list;
    }, [tailors, tailorSearch, tailorFilter]);

    // Warehouse items grouped by WO
    const itemGroups = useMemo(() => {
        const needle = itemQuery.toLowerCase().trim();
        const matches = availableItems.filter((item) =>
            needle
                ? `${item.article_name} ${item.color ?? ''} ${item.size ?? ''} ${item.work_order_number ?? ''}`.toLowerCase().includes(needle)
                : true,
        );
        const byWorkOrder = new Map<string, WorkOrderItemRecord[]>();

        for (const item of matches) {
            const key = item.work_order_number ?? '-';
            byWorkOrder.set(key, [...(byWorkOrder.get(key) ?? []), item]);
        }

        return [...byWorkOrder.entries()];
    }, [availableItems, itemQuery]);

    // 1-Click Batch Deliver All
    const handleBatchDeliver = () => {
        const delivQty = tailorBoardRow?.deliverable_qty ?? tailorBoardRow?.remaining_qty ?? 0;
        if (!selectedTailor || !tailorBoardRow || delivQty === 0) return;

        floorActions.send(
            'post',
            route('deliveries.batch-tailor', selectedTailor.id),
            {},
            {
                onStart: () => setBatchBusy(true),
                onFinish: () => setBatchBusy(false),
            },
        );
    };

    // Advance Revision Status
    const advanceRevision = (rev: RevisionRecord, tailorId?: number) => {
        floorActions.send('post', route('revisions.advance', rev.id), tailorId ? { tailor_id: tailorId } : {}, {
            onSuccess: () => toast.success(`Revisi ${rev.article_name} berlanjut: ${rev.next_status_label ?? 'Selesai'}`),
        });
    };

    // Quick Reassign Revision to Active Tailor
    const reassignRevision = (rev: RevisionRecord, targetTailorId: number) => {
        floorActions.send(
            'post',
            route('revisions.reassign', rev.id),
            { tailor_id: targetTailorId },
            {
                onSuccess: () => toast.success(`Revisi ${rev.article_name} dialihkan ke ${selectedTailor?.name}.`),
            },
        );
    };

    // Submit Pickup
    const handleSavePickup = () => {
        if (!cart.isReady) return;

        const payload = {
            ...cart.toPayload(),
            from_desk: true,
        };

        router.post(route('pickups.store'), payload, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setPickupBusy(true),
            onFinish: () => setPickupBusy(false),
            onSuccess: () => setCart(PickupCart.start(selectedTailor)),
            onError: (errors) => toast.error(FloorActions.firstError(errors)),
        });
    };

    // Filter recent deliveries for the active tailor (only unpaid / belum cair)
    const tailorRecentDeliveries = useMemo(() => {
        const unpaid = recentDeliveries.filter((d) => !d.is_paid);
        if (!selectedTailor) return unpaid.slice(0, 5);

        return unpaid.filter((d) => d.tailor_id === selectedTailor.id);
    }, [recentDeliveries, selectedTailor]);

    // Group recent deliveries by Work Order (matching Ambil layout)
    const recentDeliveryGroups = useMemo(() => {
        const groups = new Map<string, DeliveryRecord[]>();
        for (const delivery of tailorRecentDeliveries) {
            const key = delivery.work_order_number || 'Lainnya';
            const list = groups.get(key) ?? [];
            list.push(delivery);
            groups.set(key, list);
        }
        return Array.from(groups.entries());
    }, [tailorRecentDeliveries]);

    return (
        <AppLayout title="Loket Cepat (Setor & Ambil)" shortTitle="Loket cepat">
            <PageIntro
                hideTextOnPhone
                actions={
                    <>
                        <div className="hidden flex-wrap gap-2 sm:flex">
                            <Button asChild variant="outline" size="sm" className="rounded-xl shadow-xs transition-all hover:shadow-sm">
                                <Link href={route('production-reports.index')}>
                                    <BarChart3 className="size-4" />
                                    Rekap Produksi
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="rounded-xl shadow-xs transition-all hover:shadow-sm">
                                <Link href={route('deliveries.index')}>
                                    <PackageCheck className="size-4" />
                                    Halaman Setor
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="rounded-xl shadow-xs transition-all hover:shadow-sm">
                                <Link href={route('pickups.create')}>
                                    <HandPlatter className="size-4" />
                                    Halaman Ambil
                                </Link>
                            </Button>
                        </div>
                        {/* HP: tiga tautan di atas dilipat ke satu tombol supaya daftar penjahit langsung terlihat. */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="rounded-xl sm:hidden">
                                    <Ellipsis className="size-4" />
                                    Halaman lain
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem asChild>
                                    <Link href={route('production-reports.index')}>
                                        <BarChart3 />
                                        Rekap Produksi
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={route('deliveries.index')}>
                                        <PackageCheck />
                                        Halaman Setor
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={route('pickups.create')}>
                                        <HandPlatter />
                                        Halaman Ambil
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            >
                Layanan 1 Meja terpadu: Cek tanggungan, lapor/tindak revisi, setor 1-klik, dan ambil potongan kain baru langsung dalam satu layar
                kilat.
            </PageIntro>

            <div className="flex flex-col gap-6">
                {/* 1. TAILOR SELECTOR OR ACTIVE TAILOR PROFILE */}
                {!selectedTailor ? (
                    <Card asChild>
                        <div className="surface-card rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h2 className="flex items-center gap-2.5 font-display text-lg font-bold text-foreground">
                                        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <UserRound className="size-4.5" />
                                        </span>
                                        Pilih Penjahit yang Berada di Meja Loket:
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
                                        <Button variant="plain" size="plain"
                                            type="button"
                                            onClick={() => setTailorFilter('all')}
                                            className={cn(
                                                'rounded-lg px-3 py-1.5 font-semibold transition-all active:scale-95',
                                                tailorFilter === 'all'
                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                            )}
                                        >
                                            Semua ({tailors.length})
                                        </Button>
                                        <Button variant="plain" size="plain"
                                            type="button"
                                            onClick={() => setTailorFilter('holding')}
                                            className={cn(
                                                'rounded-lg px-3 py-1.5 font-semibold transition-all active:scale-95',
                                                tailorFilter === 'holding'
                                                    ? 'bg-amber-600 text-white shadow-sm'
                                                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-500/10',
                                            )}
                                        >
                                            Pegang Barang ({holdingTailorsCount})
                                        </Button>
                                        {revisionTailorsCount > 0 && (
                                            <Button variant="plain" size="plain"
                                                type="button"
                                                onClick={() => setTailorFilter('revisions')}
                                                className={cn(
                                                    'rounded-lg px-3 py-1.5 font-semibold transition-all active:scale-95',
                                                    tailorFilter === 'revisions'
                                                        ? 'bg-rose-600 text-white shadow-sm'
                                                        : 'text-rose-600 hover:bg-rose-500/10',
                                                )}
                                            >
                                                Ada Revisi ({revisionTailorsCount})
                                            </Button>
                                        )}
                                        <Button variant="plain" size="plain"
                                            type="button"
                                            onClick={() => setTailorFilter('today')}
                                            className={cn(
                                                'rounded-lg px-3 py-1.5 font-semibold transition-all active:scale-95',
                                                tailorFilter === 'today'
                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10',
                                            )}
                                        >
                                            Setor Hari Ini ({todayTailorsCount})
                                        </Button>
                                    </div>
                                </div>

                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        autoFocus
                                        value={tailorSearch}
                                        onChange={(e) => setTailorSearch(e.target.value)}
                                        placeholder="Ketik nama atau kode penjahit (contoh: Budi / P01)..."
                                        className="h-11 rounded-xl pl-10.5 pr-9 text-base shadow-2xs"
                                    />
                                    {tailorSearch && (
                                        <Button variant="plain" size="plain"
                                            type="button"
                                            onClick={() => setTailorSearch('')}
                                            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    )}
                                </div>

                                <div className="grid max-h-80 grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                    {filteredTailors.map((tailor) => {
                                        const holdingQty = tailor.holding_qty ?? 0;
                                        const revCount = tailor.revisions_count ?? 0;
                                        const todayQty = tailor.today_delivered_qty ?? 0;

                                        return (
                                            <Button variant="plain" size="plain"
                                                key={tailor.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedTailorId(tailor.id);
                                                    setTailorSearch('');
                                                }}
                                                className={cn(
                                                    'group flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors',
                                                    holdingQty > 0
                                                        ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-500/70 hover:bg-amber-500/15'
                                                        : 'border-border bg-card hover:border-foreground/30 hover:bg-muted/40',
                                                )}
                                            >
                                                <div className="flex w-full items-center justify-between gap-1">
                                                    <span className="truncate text-base font-bold text-foreground group-hover:text-primary transition-colors">
                                                        {tailor.name}
                                                    </span>
                                                    {tailor.code && (
                                                        <span className="rounded bg-muted px-1.5 py-0.2 text-[11px] font-semibold text-muted-foreground">
                                                            {tailor.code}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-0.5 flex w-full flex-wrap items-center justify-between gap-1 text-xs">
                                                    {holdingQty > 0 ? (
                                                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-bold text-amber-700 dark:text-amber-400">
                                                            📦 {holdingQty} pcs
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-muted-foreground">0 pcs bawa</span>
                                                    )}

                                                    {revCount > 0 && (
                                                        <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 font-bold text-rose-700 dark:text-rose-400">
                                                            ⚠️ {revCount} rev
                                                        </span>
                                                    )}

                                                    {todayQty > 0 && revCount === 0 && (
                                                        <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-700 dark:text-emerald-400">
                                                            +{todayQty} hari ini
                                                        </span>
                                                    )}

                                                    {tailor.type === 'makloon' && <ToneBadge tone="qc">Makloon</ToneBadge>}
                                                </div>
                                            </Button>
                                        );
                                    })}

                                    {filteredTailors.length === 0 && (
                                        <div className="col-span-full py-10 text-center text-muted-foreground">
                                            Tidak ada penjahit yang cocok dengan "{tailorSearch}".
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                ) : (
                    /* ACTIVE TAILOR BAR & METRICS DASHBOARD */
                    <Card asChild>
                        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                                <div className="flex items-center gap-3.5">
                                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl font-black text-primary shadow-xs ring-2 ring-primary/10">
                                        {selectedTailor.name
                                            .split(/\s+/)
                                            .filter(Boolean)
                                            .slice(0, 2)
                                            .map((w) => w[0].toUpperCase())
                                            .join('')}
                                    </span>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-2xl font-black tracking-tight text-foreground">{selectedTailor.name}</h2>
                                            {selectedTailor.code && (
                                                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                                                    {selectedTailor.code}
                                                </span>
                                            )}
                                            {selectedTailor.type === 'makloon' && <ToneBadge tone="qc">Makloon</ToneBadge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                            Pelayanan Loket Aktif
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedTailorId(null);
                                        setCart(PickupCart.start(null));
                                    }}
                                    className="h-9 gap-2 rounded-xl font-semibold shadow-xs hover:border-primary hover:text-primary transition-all active:scale-95"
                                >
                                    <ArrowLeftRight className="size-4" />
                                    Ganti Penjahit Lain
                                </Button>
                            </div>

                            <TailorMetrics
                                remainingQty={tailorBoardRow?.remaining_qty ?? 0}
                                deliverableQty={tailorBoardRow?.deliverable_qty ?? tailorBoardRow?.remaining_qty ?? 0}
                                itemsCount={tailorBoardRow?.items.length ?? 0}
                                todayQty={selectedTailor.today_delivered_qty ?? 0}
                                revisionQty={totalRevisionQty}
                                needsAction={deskPendingRevisions.length > 0}
                            />

                            {/* REVISION ALERT & ACTIONS SECTION (IF PENDING REVISIONS EXIST) */}
                            {deskPendingRevisions.length > 0 && (
                                <div className="rounded-xl border-2 border-rose-500/40 bg-rose-500/10 p-4 text-rose-950 dark:text-rose-100 shadow-xs">
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-rose-300/40 pb-3">
                                        <div className="flex items-center gap-2.5 font-bold text-base text-rose-700 dark:text-rose-300">
                                            <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600">
                                                <TriangleAlert className="size-4.5" />
                                            </span>
                                            <span>
                                                Perhatian: Ada {deskPendingRevisionQty} pcs jahitan cacat/revisi untuk {selectedTailor.name}!
                                            </span>
                                        </div>
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="h-8 rounded-xl text-xs border-rose-300 bg-card font-semibold shadow-2xs hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                        >
                                            <Link
                                                href={route('revisions.index', {
                                                    tailor: selectedTailor.id,
                                                })}
                                            >
                                                Buka Halaman Revisi Lengkap
                                            </Link>
                                        </Button>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {deskPendingRevisions.map((rev) => (
                                            <Card asChild key={rev.id}>
                                            <div

                                                    className="flex flex-col justify-between gap-2.5 rounded-xl bg-card p-3.5 text-xs shadow-xs border border-border/70"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-bold text-sm text-foreground truncate">
                                                                {rev.article_name}{' '}
                                                                <span className="font-normal text-muted-foreground">
                                                                    ({variantLabel(rev.color, rev.size)})
                                                                </span>
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                WO: {rev.work_order_number} {rev.part_name ? `· Bagian: ${rev.part_name}` : ''}
                                                            </p>
                                                            {rev.notes && (
                                                                <p className="text-[11px] italic text-rose-600 mt-1 bg-rose-500/5 px-2 py-1 rounded-md border border-rose-500/10">
                                                                    "{rev.notes}"
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <span className="font-display font-black text-rose-600 text-base">{rev.qty} pcs</span>
                                                            <div className="mt-0.5">
                                                                <ToneBadge tone={ToneStyle.forRevisionStatus(rev.status)}>{rev.status_label}</ToneBadge>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Physical goods location hint */}
                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                                                        {rev.is_holding_stock ? (
                                                            <span className="flex items-center gap-1 text-amber-600 font-semibold">
                                                                <Warehouse className="size-3.5 shrink-0" />
                                                                Barang ada di gudang (tanggung jawab gudang penuhi bahan)
                                                            </span>
                                                        ) : rev.returned_to_warehouse && !rev.is_holding_stock ? (
                                                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                                                <Check className="size-3.5 shrink-0" />
                                                                Bahan pengganti sudah siap di loket
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-muted-foreground">
                                                                <Package className="size-3.5 shrink-0" />
                                                                Masih disimpan penjahit
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Actions directly at the desk */}
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                        {rev.status === 'waiting_material' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => advanceRevision(rev)}
                                                                    className="h-8 flex-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                                                                >
                                                                    <Package className="size-3.5 mr-1" />
                                                                    Bahan Datang
                                                                </Button>
                                                                <ReassignRevisionSheet
                                                                    revision={rev}
                                                                    tailors={tailors}
                                                                    selectedTailor={selectedTailor}
                                                                    trigger={
                                                                        <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs font-semibold">
                                                                            <ArrowLeftRight className="size-3 mr-1" />
                                                                            Alihkan
                                                                        </Button>
                                                                    }
                                                                />
                                                            </>
                                                        )}

                                                        {rev.status === 'material_ready' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => advanceRevision(rev)}
                                                                    className="h-8 flex-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                                                >
                                                                    <Shirt className="size-3.5 mr-1" />
                                                                    Mulai Dikerjakan
                                                                </Button>
                                                                <ReassignRevisionSheet
                                                                    revision={rev}
                                                                    tailors={tailors}
                                                                    selectedTailor={selectedTailor}
                                                                    trigger={
                                                                        <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs font-semibold">
                                                                            <ArrowLeftRight className="size-3 mr-1" />
                                                                            Alihkan
                                                                        </Button>
                                                                    }
                                                                />
                                                            </>
                                                        )}

                                                        {rev.status === 'in_progress' && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => advanceRevision(rev)}
                                                                className="h-8 w-full rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                                            >
                                                                <Check className="size-3.5 mr-1" />
                                                                Selesai Jahit Revisi
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                        </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Revisi penjahit lain (dilipat) */}
                            <OtherTailorRevisions revisions={otherTailorRevisions} tailor={selectedTailor} onReassign={reassignRevision} />
                        </div>
                    </Card>
                )}

                {/* MOBILE / TABLET SEGMENTED TABS SWITCHER (< lg screens) */}
                {selectedTailor && (
                    <div className="flex rounded-xl bg-muted/60 p-1 border border-border shadow-xs lg:hidden">
                        <Button variant="plain" size="plain"
                            type="button"
                            onClick={() => setMobileTab('setor')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors',
                                mobileTab === 'setor' ? 'bg-card text-emerald-600 shadow-xs' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <PackageCheck className="size-4.5" />
                            <span>1. Setor Jahitan</span>
                            {(tailorBoardRow?.deliverable_qty ?? tailorBoardRow?.remaining_qty ?? 0) > 0 && (
                                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 font-extrabold">
                                    {tailorBoardRow?.deliverable_qty ?? tailorBoardRow?.remaining_qty}
                                </span>
                            )}
                        </Button>
                        <Button variant="plain" size="plain"
                            type="button"
                            onClick={() => setMobileTab('ambil')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95',
                                mobileTab === 'ambil' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <ShoppingBasket className="size-4.5" />
                            <span>2. Ambil Potongan</span>
                            {cart.totalQty > 0 && (
                                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary font-extrabold">{cart.totalQty}</span>
                            )}
                        </Button>
                    </div>
                )}

                {/* 2. MAIN 2-COLUMN WORKSPACE: SETOR & AMBIL */}
                {selectedTailor ? (
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* LEFT COLUMN: 1. SETOR JAHITAN JADI */}
                        <Card asChild>
                            <div
                                className={cn(
                                    'flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs',
                                    mobileTab === 'ambil' ? 'hidden lg:flex' : 'flex',
                                )}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5">
                                    <div>
                                        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                                            <PackageCheck className="size-5 text-emerald-600" />
                                            1. Setor Jahitan Jadi
                                        </h3>
                                        <p className="text-xs text-muted-foreground">Barang jadi yang dikembalikan penjahit ke loket.</p>
                                    </div>

                                    {tailorBoardRow && (tailorBoardRow.deliverable_qty ?? tailorBoardRow.remaining_qty) > 0 && (
                                        <Button
                                            onClick={handleBatchDeliver}
                                            disabled={batchBusy}
                                            className="gap-2 rounded-lg bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors"
                                        >
                                            <Zap className="size-4" />
                                            Setor Semua ({tailorBoardRow.deliverable_qty ?? tailorBoardRow.remaining_qty} pcs)
                                        </Button>
                                    )}
                                </div>

                                {(() => {
                                    const deliverableItems =
                                        tailorBoardRow?.items.filter((item) => (item.deliverable_qty ?? item.remaining_qty) > 0) ?? [];

                                    if (deliverableItems.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center bg-muted/10">
                                                <span className="mb-2.5 flex size-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 shadow-xs">
                                                    <Check className="size-6" />
                                                </span>
                                                <p className="text-base font-bold text-foreground">
                                                    {deskPendingRevisions.length > 0 ? 'Menunggu Tindakan Revisi' : 'Semua Tanggungan Bersih'}
                                                </p>
                                                <p className="text-sm text-muted-foreground max-w-xs mt-1">
                                                    {deskPendingRevisions.length > 0
                                                        ? `${selectedTailor.name} tidak memiliki jahitan siap setor (${deskPendingRevisionQty} pcs menunggu bahan di atas).`
                                                        : `${selectedTailor.name} tidak memiliki tanggungan potongan kain saat ini.`}
                                                </p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="flex flex-col gap-3">
                                            {deliverableItems.map((item) => (
                                                <DeskHoldingLine key={item.id} item={item} revisionParts={revisionParts} />
                                            ))}
                                        </div>
                                    );
                                })()}

                                {/* Setoran terakhir penjahit ini (dilipat) */}
                                <DeskRecentDeliveries
                                    groups={recentDeliveryGroups}
                                    count={tailorRecentDeliveries.length}
                                    tailorName={selectedTailor.name}
                                />
                            </div>
                        </Card>

                        {/* RIGHT COLUMN: 2. AMBIL POTONGAN BARU */}
                        <Card asChild>
                            <div
                                className={cn(
                                    'flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs',
                                    mobileTab === 'setor' ? 'hidden lg:flex' : 'flex',
                                )}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                                    <div>
                                        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                                            <ShoppingBasket className="size-5 text-primary" />
                                            2. Ambil Potongan Baru
                                        </h3>
                                        <p className="text-xs text-muted-foreground">Kain siap jahit dari gudang untuk dibawa penjahit.</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {cart.lines.length > 0 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCart(PickupCart.start(selectedTailor))}
                                                className="h-9 px-2 text-xs rounded-xl text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="size-3.5 mr-1" />
                                                Reset
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            onClick={handleSavePickup}
                                            disabled={!cart.isReady || pickupBusy}
                                            className={cn(
                                                'h-9 gap-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 px-3.5',
                                                cart.isReady
                                                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-lg'
                                                    : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60 shadow-none',
                                            )}
                                        >
                                            <ShoppingBasket className="size-4" />
                                            Ambil ({cart.totalQty} pcs)
                                        </Button>
                                    </div>
                                </div>

                                {/* Cart Summary when items are selected */}
                                {cart.totalQty > 0 && (
                                    <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2 text-xs">
                                        <span className="font-bold text-foreground">
                                            {cart.totalQty} pcs ({cart.lines.length} barang) dipilih
                                        </span>
                                        {selectedTailor.type === 'makloon' && <span className="text-muted-foreground font-medium">Makloon</span>}
                                    </div>
                                )}

                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={itemQuery}
                                        onChange={(e) => setItemQuery(e.target.value)}
                                        placeholder="Cari artikel, warna, atau nomor WO gudang..."
                                        className="h-10 rounded-xl pl-9.5 pr-8 text-sm shadow-2xs"
                                    />
                                    {itemQuery && (
                                        <Button variant="plain" size="plain"
                                            type="button"
                                            onClick={() => setItemQuery('')}
                                            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="size-3.5" />
                                        </Button>
                                    )}
                                </div>

                                {availableItems.length === 0 ? (
                                    <EmptyState className="text-base py-14">
                                        Gudang kosong. Belum ada potongan hancaan siap di gudang.
                                        <Button asChild variant="outline" size="sm" className="mt-3 rounded-xl">
                                            <Link href={route('work-orders.index')}>
                                                <ClipboardList className="size-4" />
                                                Buka Halaman WO
                                            </Link>
                                        </Button>
                                    </EmptyState>
                                ) : (
                                    <div className="flex max-h-[560px] flex-col gap-4 overflow-y-auto pr-1">
                                        {itemGroups.map(([number, items]) => (
                                            <div
                                                key={number}
                                                className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/20 p-3 shadow-2xs"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                                                    <h4 className="font-display font-bold text-foreground text-sm flex items-center gap-2">
                                                        <ClipboardList className="size-3.5 text-primary" />
                                                        {number}
                                                    </h4>
                                                    {items[0].due_at && <ToneBadge tone="neutral">{dueLabel(items[0].due_at)}</ToneBadge>}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {items.map((item) => (
                                                        <DeskItemRow
                                                            key={item.id}
                                                            item={item}
                                                            qty={cart.qtyOf(item.id)}
                                                            onQty={(qty) => setCart(cart.withQty(item, qty))}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {itemGroups.length === 0 && <EmptyState>Tidak ada barang gudang yang cocok dengan pencarian.</EmptyState>}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                ) : (
                    /* EMPTY STATE WHEN NO TAILOR IS SELECTED */
                    <Card asChild>
                        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center bg-card">
                            <span className="mb-3.5 flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs ring-2 ring-primary/10">
                                <Zap className="size-8" />
                            </span>
                            <h3 className="font-display text-xl font-bold text-foreground">Siap Melayani Penjahit</h3>
                            <p className="max-w-md text-sm text-muted-foreground mt-1.5">
                                Pilih nama penjahit pada daftar di atas untuk membuka alur setor jahitan dan ambil potongan kain baru secara instan.
                            </p>
                        </div>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
