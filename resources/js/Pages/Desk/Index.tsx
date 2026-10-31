import { ConfirmButton } from '@/components/confirm-button';
import { EmptyState } from '@/components/empty-state';
import { ReassignRevisionSheet, ReportDefectSheet } from '@/components/sewing/desk/defect-sheets';
import { QtyStepper } from '@/components/sewing/qty-stepper';
import { PageIntro } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PickupCart } from '@/domain/production/pickup-cart';
import AppLayout from '@/layouts/app-layout';
import { dueLabel, formatIdr, variantLabel } from '@/lib/format';
import { ToneStyle } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { floorActions, FloorActions } from '@/services/floor-actions';
import type { BoardRow, DeliveryRecord, PickupItemRecord, RevisionPartRecord, RevisionRecord, TailorRecord, WorkOrderItemRecord } from '@/types/sewing';
import { Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeftRight,
    Check,
    ClipboardList,
    Coins,
    HandPlatter,
    History,
    Package,
    PackageCheck,
    Search,
    Shirt,
    ShoppingBasket,
    Sparkles,
    TriangleAlert,
    Undo2,
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

    const totalRevisionQty = useMemo(
        () => tailorRevisions.reduce((sum, r) => sum + r.qty, 0),
        [tailorRevisions],
    );

    // Revisions that need desk action (waiting material or material ready at desk to be started).
    // In-progress revisions have moved to the tailor and appear in "1. Setor Jahitan Jadi".
    const deskPendingRevisions = useMemo(
        () => tailorRevisions.filter((r) => r.status === 'waiting_material' || r.status === 'material_ready' || (r.status === 'in_progress' && !r.pickup_item_id)),
        [tailorRevisions],
    );

    const deskPendingRevisionQty = useMemo(
        () => deskPendingRevisions.reduce((sum, r) => sum + r.qty, 0),
        [deskPendingRevisions],
    );

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
            needle ? `${item.article_name} ${item.color ?? ''} ${item.size ?? ''} ${item.work_order_number ?? ''}`.toLowerCase().includes(needle) : true,
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
        floorActions.send(
            'post',
            route('revisions.advance', rev.id),
            tailorId ? { tailor_id: tailorId } : {},
            {
                onSuccess: () => toast.success(`Revisi ${rev.article_name} berlanjut: ${rev.next_status_label ?? 'Selesai'}`),
            },
        );
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

    // Filter recent deliveries for the active tailor
    const tailorRecentDeliveries = useMemo(() => {
        if (!selectedTailor) return recentDeliveries.slice(0, 5);

        return recentDeliveries.filter((d) => d.tailor_id === selectedTailor.id);
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
        <AppLayout title="Loket Cepat (Setor & Ambil)">
            <PageIntro
                actions={
                    <div className="flex gap-2">
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
                }
            >
                Layanan 1 Meja terpadu: Cek tanggungan, lapor/tindak revisi, setor 1-klik, dan ambil potongan kain baru langsung dalam satu layar kilat.
            </PageIntro>

            <div className="flex flex-col gap-6 pb-40">
                {/* 1. TAILOR SELECTOR OR ACTIVE TAILOR PROFILE */}
                {!selectedTailor ? (
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
                                    <button
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
                                    </button>
                                    <button
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
                                    </button>
                                    {revisionTailorsCount > 0 && (
                                        <button
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
                                        </button>
                                    )}
                                    <button
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
                                    </button>
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
                                    <button
                                        type="button"
                                        onClick={() => setTailorSearch('')}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-4" />
                                    </button>
                                )}
                            </div>

                            <div className="grid max-h-80 grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                {filteredTailors.map((tailor) => {
                                    const holdingQty = tailor.holding_qty ?? 0;
                                    const revCount = tailor.revisions_count ?? 0;
                                    const todayQty = tailor.today_delivered_qty ?? 0;

                                    return (
                                        <button
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
                                        </button>
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
                ) : (
                    /* ACTIVE TAILOR BAR & METRICS DASHBOARD */
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

                        {/* 3 CORE SUMMARY METRICS (EASY TO READ) */}
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                            {/* Card 1: Tanggungan di Tangan */}
                            <div
                                className={cn(
                                    'flex items-center justify-between rounded-xl border p-4 transition-all duration-200 hover:shadow-sm',
                                    (tailorBoardRow?.remaining_qty ?? 0) > 0
                                        ? 'border-amber-500/30 bg-amber-500/5'
                                        : 'border-border/60 bg-muted/20',
                                )}
                            >
                                <div>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Tanggungan Di Tangan
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {(tailorBoardRow?.items.length ?? 0) > 0
                                            ? (tailorBoardRow?.deliverable_qty ?? tailorBoardRow?.remaining_qty) !== (tailorBoardRow?.remaining_qty ?? 0)
                                                ? `${tailorBoardRow?.deliverable_qty ?? 0} siap setor · ${(tailorBoardRow?.remaining_qty ?? 0) - (tailorBoardRow?.deliverable_qty ?? 0)} revisi`
                                                : `${tailorBoardRow?.items.length} macam potongan`
                                            : 'Semua potongan sudah disetor'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span
                                        className={cn(
                                            'font-display text-3xl font-black tabular leading-none',
                                            (tailorBoardRow?.remaining_qty ?? 0) > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
                                        )}
                                    >
                                        {tailorBoardRow?.remaining_qty ?? 0}
                                    </span>
                                    <span className="ml-1 text-xs font-bold text-muted-foreground">pcs</span>
                                </div>
                            </div>

                            {/* Card 2: Setor Hari Ini */}
                            <div
                                className={cn(
                                    'flex items-center justify-between rounded-xl border p-4 transition-all duration-200 hover:shadow-sm',
                                    (selectedTailor.today_delivered_qty ?? 0) > 0
                                        ? 'border-emerald-500/30 bg-emerald-500/5'
                                        : 'border-border/60 bg-muted/20',
                                )}
                            >
                                <div>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="size-3.5 text-emerald-600" />
                                        Disetor Hari Ini
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                        {selectedTailor.today_earnings
                                            ? `Upah: ${formatIdr(selectedTailor.today_earnings)}`
                                            : selectedTailor.type === 'makloon'
                                              ? 'Tipe Makloon'
                                              : 'Belum setor hari ini'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span
                                        className={cn(
                                            'font-display text-3xl font-black tabular leading-none',
                                            (selectedTailor.today_delivered_qty ?? 0) > 0
                                                ? 'text-emerald-700 dark:text-emerald-400'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {selectedTailor.today_delivered_qty ?? 0}
                                    </span>
                                    <span className="ml-1 text-xs font-bold text-muted-foreground">pcs</span>
                                </div>
                            </div>

                            {/* Card 3: Tanggungan Revisi / Cacat */}
                            <div
                                className={cn(
                                    'flex items-center justify-between rounded-xl border p-4 transition-all duration-200 hover:shadow-sm',
                                    totalRevisionQty > 0
                                        ? 'border-rose-500/40 bg-rose-500/10'
                                        : 'border-border/60 bg-muted/20',
                                )}
                            >
                                <div>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <AlertCircle className={cn('size-3.5', totalRevisionQty > 0 ? 'text-rose-600' : 'text-muted-foreground')} />
                                        Revisi / Cacat Jahitan
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {deskPendingRevisions.length > 0 ? (
                                            <span className="font-bold text-rose-600">Perlu tindakan di loket</span>
                                        ) : totalRevisionQty > 0 ? (
                                            <span className="font-semibold text-amber-600">Sedang dikerjakan penjahit</span>
                                        ) : (
                                            <span className="text-emerald-600 font-medium">Bersih (Tidak ada komplain)</span>
                                        )}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span
                                        className={cn(
                                            'font-display text-3xl font-black tabular leading-none',
                                            totalRevisionQty > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
                                        )}
                                    >
                                        {totalRevisionQty}
                                    </span>
                                    <span className="ml-1 text-xs font-bold text-muted-foreground">pcs</span>
                                </div>
                            </div>
                        </div>

                        {/* REVISION ALERT & ACTIONS SECTION (IF PENDING REVISIONS EXIST) */}
                        {deskPendingRevisions.length > 0 && (
                            <div className="rounded-xl border-2 border-rose-500/40 bg-rose-500/10 p-4 text-rose-950 dark:text-rose-100 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-rose-300/40 pb-3">
                                    <div className="flex items-center gap-2.5 font-bold text-base text-rose-700 dark:text-rose-300">
                                        <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600">
                                            <TriangleAlert className="size-4.5" />
                                        </span>
                                        <span>Perhatian: Ada {deskPendingRevisionQty} pcs jahitan cacat/revisi untuk {selectedTailor.name}!</span>
                                    </div>
                                    <Button asChild size="sm" variant="outline" className="h-8 rounded-xl text-xs border-rose-300 bg-card font-semibold shadow-2xs hover:bg-rose-50 dark:hover:bg-rose-950/40">
                                        <Link href={route('revisions.index', { tailor: selectedTailor.id })}>
                                            Buka Halaman Revisi Lengkap
                                        </Link>
                                    </Button>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    {deskPendingRevisions.map((rev) => (
                                        <div key={rev.id} className="flex flex-col justify-between gap-2.5 rounded-xl bg-card p-3.5 text-xs shadow-xs border border-border/70">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-sm text-foreground truncate">
                                                        {rev.article_name} <span className="font-normal text-muted-foreground">({variantLabel(rev.color, rev.size)})</span>
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
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* REVISIONS FROM OTHER TAILORS READY TO BE CLAIMED / WORKED ON */}
                        {otherTailorRevisions.length > 0 && (
                            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <ArrowLeftRight className="size-3.5 text-primary" />
                                        Revisi Penjahit Lain yang Siap Dikerjakan ({otherTailorRevisions.length}):
                                    </p>
                                    <span className="text-[11px] text-muted-foreground">Bisa diserahkan ke {selectedTailor.name}</span>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {otherTailorRevisions.map((rev) => (
                                        <div key={rev.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/20 p-3 text-xs border border-border/60">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-foreground truncate">{rev.article_name} ({variantLabel(rev.color, rev.size)})</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    {rev.qty} pcs · WO {rev.work_order_number} · Asal: <strong>{rev.tailor_name}</strong>
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => reassignRevision(rev, selectedTailor.id)}
                                                className="h-8 rounded-lg text-xs font-bold shrink-0 hover:bg-primary hover:text-primary-foreground shadow-2xs active:scale-95"
                                            >
                                                Kerjakan ({selectedTailor.name})
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* MOBILE / TABLET SEGMENTED TABS SWITCHER (< lg screens) */}
                {selectedTailor && (
                    <div className="flex rounded-xl bg-muted/60 p-1 border border-border shadow-xs lg:hidden">
                        <button
                            type="button"
                            onClick={() => setMobileTab('setor')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors',
                                mobileTab === 'setor'
                                    ? 'bg-card text-emerald-600 shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <PackageCheck className="size-4.5" />
                            <span>1. Setor Jahitan</span>
                            {(tailorBoardRow?.deliverable_qty ?? tailorBoardRow?.remaining_qty ?? 0) > 0 && (
                                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 font-extrabold">
                                    {tailorBoardRow?.deliverable_qty ?? tailorBoardRow?.remaining_qty}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileTab('ambil')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95',
                                mobileTab === 'ambil'
                                    ? 'bg-card text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <ShoppingBasket className="size-4.5" />
                            <span>2. Ambil Potongan</span>
                            {cart.totalQty > 0 && (
                                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary font-extrabold">
                                    {cart.totalQty}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* 2. MAIN 2-COLUMN WORKSPACE: SETOR & AMBIL */}
                {selectedTailor ? (
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* LEFT COLUMN: 1. SETOR JAHITAN JADI */}
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
                                const deliverableItems = tailorBoardRow?.items.filter(
                                    (item) => (item.deliverable_qty ?? item.remaining_qty) > 0,
                                ) ?? [];

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
                                            <DeskHoldingLine
                                                key={item.id}
                                                item={item}
                                                revisionParts={revisionParts}
                                            />
                                        ))}
                                    </div>
                                );
                            })()}

                            {/* Recent Setoran from this tailor (styled like Ambil Potongan Baru) */}
                            {recentDeliveryGroups.length > 0 && (
                                <div className="mt-auto flex flex-col gap-2.5 border-t border-border/60 pt-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                            <History className="size-3.5 text-primary" />
                                            Setoran Baru Saja Dicatat ({selectedTailor.name}):
                                        </p>
                                        <span className="text-[11px] font-semibold text-muted-foreground">
                                            {tailorRecentDeliveries.length} catatan
                                        </span>
                                    </div>

                                    <div className="flex max-h-[380px] flex-col gap-3 overflow-y-auto pr-1">
                                        {recentDeliveryGroups.map(([woNumber, deliveries]) => {
                                            const totalQty = deliveries.reduce((sum, d) => sum + d.qty, 0);
                                            return (
                                                <div key={woNumber} className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/20 p-3 shadow-2xs">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                                                        <h4 className="font-display font-bold text-foreground text-xs flex items-center gap-1.5">
                                                            <ClipboardList className="size-3.5 text-primary" />
                                                            {woNumber}
                                                        </h4>
                                                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
                                                            +{totalQty} pcs
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        {deliveries.map((delivery) => (
                                                            <div key={delivery.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card p-2.5 shadow-2xs hover:border-border transition-all">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-bold text-foreground text-xs truncate">
                                                                        {delivery.article_name}{' '}
                                                                        <span className="font-normal text-muted-foreground">({variantLabel(delivery.color, delivery.size)})</span>
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                        {delivery.delivered_at}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className="font-display font-black tabular text-emerald-600 text-sm">+{delivery.qty} pcs</span>
                                                                    {delivery.can_undo && (
                                                                        <ConfirmButton
                                                                            confirmLabel="Batalkan"
                                                                            idleClassName="text-muted-foreground hover:text-destructive h-7 px-2 text-xs rounded-lg"
                                                                            onConfirm={() =>
                                                                                floorActions.send('delete', route('deliveries.destroy', delivery.id))
                                                                            }
                                                                        >
                                                                            <Undo2 className="size-3" />
                                                                        </ConfirmButton>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: 2. AMBIL POTONGAN BARU */}
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
                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                        <Coins className="size-3.5 text-amber-600" />
                                        {selectedTailor.type === 'makloon'
                                            ? 'Makloon'
                                            : `Perkiraan upah: ${formatIdr(cart.estimatedWage)}`}
                                    </span>
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
                                    <button
                                        type="button"
                                        onClick={() => setItemQuery('')}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-3.5" />
                                    </button>
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
                                        <div key={number} className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/20 p-3 shadow-2xs">
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
                    </div>
                ) : (
                    /* EMPTY STATE WHEN NO TAILOR IS SELECTED */
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center bg-card">
                        <span className="mb-3.5 flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs ring-2 ring-primary/10">
                            <Zap className="size-8" />
                        </span>
                        <h3 className="font-display text-xl font-bold text-foreground">Siap Melayani Penjahit</h3>
                        <p className="max-w-md text-sm text-muted-foreground mt-1.5">
                            Pilih nama penjahit pada daftar di atas untuk membuka alur setor jahitan dan ambil potongan kain baru secara instan.
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function DeskHoldingLine({
    item,
    revisionParts,
}: {
    item: PickupItemRecord;
    revisionParts: RevisionPartRecord[];
}) {
    const [custom, setCustom] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);

    const deliverableQty = item.deliverable_qty ?? item.remaining_qty;
    const blockedRevisionQty = item.blocked_revision_qty ?? 0;
    const inProgressRevisionQty = item.in_progress_revision_qty ?? 0;
    const hasBlockedRevisions = blockedRevisionQty > 0;
    const hasInProgressRevisions = inProgressRevisionQty > 0;

    const deliver = (qty: number) =>
        floorActions.send(
            'post',
            route('deliveries.store', item.id),
            { qty },
            {
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                onSuccess: () => setCustom(null),
            },
        );

    return (
        <div className="group flex flex-col gap-2.5 rounded-xl border border-border/60 bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-xs">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-foreground truncate">{item.article_name}</p>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">{variantLabel(item.color, item.size)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        WO: {item.work_order_number} · Diambil {item.age_days === 0 ? 'hari ini' : `${item.age_days} hari lalu`}
                    </p>
                    {hasBlockedRevisions && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md">
                            <TriangleAlert className="size-3" />
                            {blockedRevisionQty} pcs menunggu bahan
                        </p>
                    )}
                    {hasInProgressRevisions && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">
                            <Shirt className="size-3" />
                            {inProgressRevisionQty} pcs perbaikan revisi (siap setor)
                        </p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="font-display text-2xl leading-none font-black tabular text-emerald-600 dark:text-emerald-400">
                        {deliverableQty}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        siap setor {hasBlockedRevisions ? `(total ${item.remaining_qty} pcs)` : `dari ${item.qty} pcs`}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {custom === null ? (
                    <>
                        <Button
                            size="sm"
                            onClick={() => deliver(deliverableQty)}
                            disabled={busy || deliverableQty <= 0}
                            className="h-8.5 gap-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
                        >
                            <PackageCheck className="size-3.5" />
                            Setor Semua ({deliverableQty})
                        </Button>
                        {deliverableQty > 1 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCustom(1)}
                                disabled={busy}
                                className="h-8.5 rounded-xl text-xs font-semibold hover:border-primary transition-all active:scale-95"
                            >
                                Sebagian
                            </Button>
                        )}
                        <ReportDefectSheet
                            item={{
                                ...item,
                                remaining_qty: deliverableQty,
                            }}
                            revisionParts={revisionParts}
                            trigger={
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy || deliverableQty <= 0}
                                    className="h-8.5 rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all active:scale-95"
                                >
                                    <TriangleAlert className="size-3.5 mr-1" />
                                    Cacat
                                </Button>
                            }
                        />
                        {item.can_cancel && (
                            <ConfirmButton
                                confirmLabel="Batal Ambil"
                                idleClassName="text-muted-foreground hover:text-destructive h-8.5 px-2.5 text-xs rounded-xl"
                                disabled={busy}
                                onConfirm={() => floorActions.send('post', route('pickup-items.cancel', item.id))}
                            >
                                <Undo2 className="size-3" />
                                Salah ambil
                            </ConfirmButton>
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-2">
                        <QtyStepper value={custom} min={1} max={deliverableQty} onChange={setCustom} label="Jumlah setor" />
                        <Button size="sm" onClick={() => deliver(custom)} disabled={busy} className="h-8.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                            Setor {custom}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setCustom(null)} className="h-8.5 rounded-xl text-xs">
                            Batal
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

function DeskItemRow({ item, qty, onQty }: { item: WorkOrderItemRecord; qty: number; onQty: (qty: number) => void }) {
    const selected = qty > 0;

    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition-all duration-200',
                selected
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs'
                    : 'border-border/60 bg-card hover:border-primary/40 hover:shadow-2xs',
            )}
        >
            <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-foreground">{item.article_name}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-0.5">{variantLabel(item.color, item.size)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                    Stok gudang: <strong className="text-stage-ready font-extrabold">{item.available_qty} pcs</strong>
                    {item.sewing_rate > 0 ? ` · ${formatIdr(item.sewing_rate)}/pcs` : ''}
                </p>
            </div>

            {selected ? (
                <div className="flex items-center gap-2">
                    <QtyStepper value={qty} min={0} max={item.available_qty} onChange={onQty} label={`Jumlah ${item.article_name}`} />
                    {qty < item.available_qty && (
                        <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs font-semibold" onClick={() => onQty(item.available_qty)}>
                            Semua
                        </Button>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-1.5">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg text-xs font-semibold hover:border-primary hover:text-primary transition-all active:scale-95"
                        onClick={() => onQty(1)}
                    >
                        +1
                    </Button>
                    {item.available_qty >= 5 && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs font-semibold hover:border-primary hover:text-primary transition-all active:scale-95"
                            onClick={() => onQty(5)}
                        >
                            +5
                        </Button>
                    )}
                    {item.available_qty > 1 && (
                        <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 rounded-lg text-xs font-bold transition-all active:scale-95"
                            onClick={() => onQty(item.available_qty)}
                        >
                            Semua ({item.available_qty})
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
