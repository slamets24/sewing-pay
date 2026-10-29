import { ConfirmButton } from '@/components/confirm-button';
import { EmptyState } from '@/components/empty-state';
import { QtyStepper } from '@/components/sewing/qty-stepper';
import { PageIntro } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PickupCart } from '@/domain/production/pickup-cart';
import AppLayout from '@/layouts/app-layout';
import { dueLabel, formatIdr, variantLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { floorActions, FloorActions } from '@/services/floor-actions';
import type { BoardRow, DeliveryRecord, PickupItemRecord, TailorRecord, WorkOrderItemRecord } from '@/types/sewing';
import { Link, router } from '@inertiajs/react';
import {
    Check,
    ClipboardList,
    HandPlatter,
    History,
    PackageCheck,
    Search,
    ShoppingBasket,
    TriangleAlert,
    Undo2,
    UserRound,
    Users,
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
};

export default function DeskIndex({ tailors, board, availableItems, presetTailorId, recentDeliveries }: DeskProps) {
    const [selectedTailorId, setSelectedTailorId] = useState<number | null>(() => presetTailorId ?? null);
    const [tailorSearch, setTailorSearch] = useState('');
    const [filterHoldingOnly, setFilterHoldingOnly] = useState(false);
    const [itemQuery, setItemQuery] = useState('');
    const [batchBusy, setBatchBusy] = useState(false);
    const [pickupBusy, setPickupBusy] = useState(false);

    // Selected Tailor
    const selectedTailor = useMemo(() => tailors.find((t) => t.id === selectedTailorId) ?? null, [tailors, selectedTailorId]);

    // Board row for selected tailor (items currently held)
    const tailorBoardRow = useMemo(() => board.find((row) => row.tailor.id === selectedTailorId) ?? null, [board, selectedTailorId]);

    // Pickup Cart for the selected tailor
    const [cart, setCart] = useState(() => PickupCart.start(selectedTailor));

    // When selected tailor changes, reset cart with that tailor
    useEffect(() => {
        setCart((current) => (current.tailor?.id === selectedTailor?.id ? current.syncWith(availableItems) : PickupCart.start(selectedTailor)));
    }, [selectedTailor, availableItems]);

    // Tailor count with holding items
    const holdingTailorsCount = useMemo(() => tailors.filter((t) => (t.holding_qty ?? 0) > 0).length, [tailors]);

    // Filtered tailors for selection
    const filteredTailors = useMemo(() => {
        const needle = tailorSearch.toLowerCase().trim();
        let list = tailors;

        if (filterHoldingOnly) {
            list = list.filter((t) => (t.holding_qty ?? 0) > 0);
        }

        if (needle) {
            list = list.filter((t) => `${t.name} ${t.code ?? ''}`.toLowerCase().includes(needle));
        }

        return list;
    }, [tailors, tailorSearch, filterHoldingOnly]);

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
        if (!selectedTailor || !tailorBoardRow || tailorBoardRow.remaining_qty === 0) return;

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

    return (
        <AppLayout title="Loket Cepat (Setor & Ambil)">
            <PageIntro
                actions={
                    <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={route('deliveries.index')}>
                                <PackageCheck className="size-4" />
                                Halaman Setor
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href={route('pickups.create')}>
                                <HandPlatter className="size-4" />
                                Halaman Ambil
                            </Link>
                        </Button>
                    </div>
                }
            >
                Loket terpadu untuk menangani 50 penjahit dengan cepat: Pilih penjahit, langsung 1-klik setor semua jahitan jadi, lalu pilih potongan kain baru dalam satu layar!
            </PageIntro>

            <div className="flex flex-col gap-5 pb-36">
                {/* 1. TAILOR SELECTOR BAR */}
                <div className="rounded-xl border-2 bg-card p-4 shadow-sm">
                    {!selectedTailor ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                                    <UserRound className="size-5 text-primary" />
                                    Pilih Penjahit yang Berada di Meja Loket:
                                </h2>
                                <div className="flex items-center gap-1.5 text-sm">
                                    <button
                                        type="button"
                                        onClick={() => setFilterHoldingOnly(false)}
                                        className={cn(
                                            'rounded-md px-2.5 py-1 font-medium transition-colors',
                                            !filterHoldingOnly ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        Semua ({tailors.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilterHoldingOnly(true)}
                                        className={cn(
                                            'rounded-md px-2.5 py-1 font-medium transition-colors',
                                            filterHoldingOnly ? 'bg-emerald-600 text-white font-bold' : 'text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        Sedang Pegang Barang ({holdingTailorsCount})
                                    </button>
                                </div>
                            </div>

                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    autoFocus
                                    value={tailorSearch}
                                    onChange={(e) => setTailorSearch(e.target.value)}
                                    placeholder="Ketik nama atau kode penjahit (contoh: Budi / P01)..."
                                    className="pl-9 text-base"
                                />
                            </div>

                            <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                                {filteredTailors.map((tailor) => {
                                    const holdingQty = tailor.holding_qty ?? 0;

                                    return (
                                        <button
                                            key={tailor.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedTailorId(tailor.id);
                                                setTailorSearch('');
                                            }}
                                            className="flex flex-col items-start gap-1 rounded-lg border-2 bg-card p-2.5 text-left transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
                                        >
                                            <div className="flex w-full items-center justify-between gap-1">
                                                <span className="truncate text-base font-bold">{tailor.name}</span>
                                                {tailor.code && <span className="text-xs font-semibold text-muted-foreground">{tailor.code}</span>}
                                            </div>
                                            <div className="flex w-full items-center justify-between text-xs">
                                                {holdingQty > 0 ? (
                                                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-700 dark:text-emerald-400">
                                                        📦 {holdingQty} pcs
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">0 pcs</span>
                                                )}
                                                {tailor.type === 'makloon' && <ToneBadge tone="qc">Makloon</ToneBadge>}
                                            </div>
                                        </button>
                                    );
                                })}

                                {filteredTailors.length === 0 && (
                                    <div className="col-span-full py-6 text-center text-muted-foreground">
                                        Tidak ada penjahit yang cocok dengan "{tailorSearch}".
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                                    {selectedTailor.name
                                        .split(/\s+/)
                                        .filter(Boolean)
                                        .slice(0, 2)
                                        .map((w) => w[0].toUpperCase())
                                        .join('')}
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold">{selectedTailor.name}</h2>
                                        {selectedTailor.code && <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold">{selectedTailor.code}</span>}
                                        {selectedTailor.type === 'makloon' && <ToneBadge tone="qc">Makloon</ToneBadge>}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {tailorBoardRow && tailorBoardRow.remaining_qty > 0 ? (
                                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                                Sedang memegang <strong>{tailorBoardRow.remaining_qty} pcs</strong> ({tailorBoardRow.items.length} macam barang)
                                            </span>
                                        ) : (
                                            <span>Tidak ada tanggungan barang. Siap mengambil potongan baru.</span>
                                        )}
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
                                className="gap-1.5"
                            >
                                <Users className="size-4" />
                                Ganti Penjahit Lain
                            </Button>
                        </div>
                    )}
                </div>

                {/* 2. MAIN WORKSPACE: SETOR & AMBIL */}
                {selectedTailor ? (
                    <div className="grid gap-5 lg:grid-cols-2">
                        {/* LEFT COLUMN: SETOR JAHITAN */}
                        <div className="flex flex-col gap-4 rounded-xl border-2 bg-card p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                                <div>
                                    <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                                        <PackageCheck className="size-5 text-emerald-600" />
                                        1. Setor Jahitan Jadi
                                    </h3>
                                    <p className="text-xs text-muted-foreground">Barang yang diserahkan kembali oleh {selectedTailor.name}.</p>
                                </div>

                                {tailorBoardRow && tailorBoardRow.remaining_qty > 0 && (
                                    <Button
                                        onClick={handleBatchDeliver}
                                        disabled={batchBusy}
                                        className="gap-2 bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 shadow-md"
                                    >
                                        <Zap className="size-4" />
                                        Setor Semua ({tailorBoardRow.remaining_qty} pcs)
                                    </Button>
                                )}
                            </div>

                            {!tailorBoardRow || tailorBoardRow.items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
                                    <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                                        <Check className="size-6" />
                                    </span>
                                    <p className="text-base font-bold">Semua Bersih / Tidak Ada Tanggungan</p>
                                    <p className="text-sm text-muted-foreground">Penjahit ini tidak sedang memegang potongan jahitan.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col divide-y rounded-lg border bg-muted/20">
                                    {tailorBoardRow.items.map((item) => (
                                        <DeskHoldingLine key={item.id} item={item} />
                                    ))}
                                </div>
                            )}

                            {/* Recent Setoran from this tailor */}
                            {tailorRecentDeliveries.length > 0 && (
                                <div className="mt-2 flex flex-col gap-2 border-t pt-3">
                                    <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                        <History className="size-3.5" />
                                        Setoran Baru Saja Dicatat ({selectedTailor.name}):
                                    </p>
                                    <div className="flex flex-col divide-y rounded-md border bg-card text-xs">
                                        {tailorRecentDeliveries.map((delivery) => (
                                            <div key={delivery.id} className="flex items-center justify-between p-2">
                                                <div>
                                                    <span className="font-bold">{delivery.article_name}</span>{' '}
                                                    <span className="text-muted-foreground">({variantLabel(delivery.color, delivery.size)})</span>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {delivery.work_order_number} · {delivery.delivered_at}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold tabular text-emerald-600">+{delivery.qty} pcs</span>
                                                    {delivery.can_undo && (
                                                        <ConfirmButton
                                                            confirmLabel="Batalkan"
                                                            idleClassName="text-muted-foreground hover:text-destructive h-7 px-2 text-xs"
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
                            )}
                        </div>

                        {/* RIGHT COLUMN: AMBIL BAHAN BARU */}
                        <div className="flex flex-col gap-4 rounded-xl border-2 bg-card p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                                <div>
                                    <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                                        <ShoppingBasket className="size-5 text-primary" />
                                        2. Ambil Potongan Baru
                                    </h3>
                                    <p className="text-xs text-muted-foreground">Pilih potongan kain dari gudang untuk dibawa penjahit.</p>
                                </div>

                                <div className="text-right">
                                    <span className="font-bold text-primary">{cart.totalQty} pcs</span> dipilih
                                </div>
                            </div>

                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={itemQuery}
                                    onChange={(e) => setItemQuery(e.target.value)}
                                    placeholder="Cari artikel, warna, atau nomor WO gudang..."
                                    className="pl-9 text-sm"
                                />
                            </div>

                            {availableItems.length === 0 ? (
                                <EmptyState className="text-base">
                                    Gudang kosong. Belum ada potongan hancaan siap di gudang.
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('work-orders.index')}>
                                            <ClipboardList />
                                            Buka WO
                                        </Link>
                                    </Button>
                                </EmptyState>
                            ) : (
                                <div className="flex max-h-[520px] flex-col gap-4 overflow-y-auto pr-1">
                                    {itemGroups.map(([number, items]) => (
                                        <div key={number} className="flex flex-col gap-2 rounded-lg border bg-muted/10 p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h4 className="font-display font-bold text-foreground">{number}</h4>
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

                                    {itemGroups.length === 0 && <EmptyState>Tidak ada barang yang cocok dengan pencarian.</EmptyState>}
                                </div>
                            )}

                            {/* Cart Summary & Save Action */}
                            <div className="mt-auto flex flex-col gap-2 rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-base text-foreground">
                                            {cart.totalQty > 0 ? `${cart.totalQty} pcs (${cart.lines.length} barang)` : 'Belum ada barang dipilih'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {selectedTailor.type === 'makloon'
                                                ? 'Makloon (tidak masuk slip gaji)'
                                                : `Perkiraan upah: ${formatIdr(cart.estimatedWage)}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {cart.lines.length > 0 && (
                                            <Button variant="ghost" size="sm" onClick={() => setCart(PickupCart.start(selectedTailor))}>
                                                <X className="size-4" />
                                                Kosongkan
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            onClick={handleSavePickup}
                                            disabled={!cart.isReady || pickupBusy}
                                            className="gap-1.5 font-bold shadow"
                                        >
                                            <Check className="size-4" />
                                            Simpan Ambil ({cart.totalQty} pcs)
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 text-center">
                        <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Zap className="size-7" />
                        </span>
                        <h3 className="font-display text-xl font-bold">Siap Melayani Penjahit</h3>
                        <p className="max-w-md text-sm text-muted-foreground">
                            Pilih nama penjahit pada daftar di atas untuk membuka alur setor dan ambil dalam satu layar secara kilat.
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function DeskHoldingLine({ item }: { item: PickupItemRecord }) {
    const [custom, setCustom] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);

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
        <div className="flex flex-col gap-2 p-3 transition-colors hover:bg-card">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-bold text-sm">{item.article_name}</p>
                    <p className="text-xs text-muted-foreground">{variantLabel(item.color, item.size)}</p>
                    <p className="text-[11px] text-muted-foreground">
                        {item.work_order_number} · Diambil {item.age_days === 0 ? 'hari ini' : `${item.age_days} hari lalu`}
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-display text-2xl leading-none font-bold tabular text-stage-sewing">{item.remaining_qty}</p>
                    <p className="text-[11px] text-muted-foreground">sisa dari {item.qty} pcs</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
                {custom === null ? (
                    <>
                        <Button size="sm" onClick={() => deliver(item.remaining_qty)} disabled={busy} className="h-8 gap-1 text-xs">
                            <PackageCheck className="size-3.5" />
                            Setor semua ({item.remaining_qty})
                        </Button>
                        {item.remaining_qty > 1 && (
                            <Button size="sm" variant="outline" onClick={() => setCustom(1)} disabled={busy} className="h-8 text-xs">
                                Sebagian
                            </Button>
                        )}
                        <Button asChild size="sm" variant="ghost" disabled={busy} className="h-8 text-xs text-muted-foreground">
                            <Link href={route('revisions.index', { lapor: item.id })}>
                                <TriangleAlert className="size-3.5" />
                                Cacat
                            </Link>
                        </Button>
                        {item.can_cancel && (
                            <ConfirmButton
                                confirmLabel="Batal"
                                idleClassName="text-muted-foreground h-8 px-2 text-xs"
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
                        <QtyStepper value={custom} min={1} max={item.remaining_qty} onChange={setCustom} label="Jumlah setor" />
                        <Button size="sm" onClick={() => deliver(custom)} disabled={busy} className="h-8 text-xs">
                            Setor {custom}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setCustom(null)} className="h-8 text-xs">
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
        <div className={cn('flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5 transition-colors', selected ? 'border-primary bg-primary/10' : 'bg-card')}>
            <div className="min-w-0 flex-1">
                <p className="font-bold text-sm">{item.article_name}</p>
                <p className="text-xs text-muted-foreground">{variantLabel(item.color, item.size)}</p>
                <p className="text-[11px] text-muted-foreground">
                    Di gudang: <strong className="text-stage-ready">{item.available_qty} pcs</strong>
                    {item.sewing_rate > 0 ? ` · tarif ${formatIdr(item.sewing_rate)}` : ''}
                </p>
            </div>

            {selected ? (
                <div className="flex items-center gap-2">
                    <QtyStepper value={qty} min={0} max={item.available_qty} onChange={onQty} label={`Jumlah ${item.article_name}`} />
                    {qty < item.available_qty && (
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onQty(item.available_qty)}>
                            Semua
                        </Button>
                    )}
                </div>
            ) : (
                <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onQty(1)}>
                        +1
                    </Button>
                    {item.available_qty > 1 && (
                        <Button size="sm" className="h-8 text-xs" onClick={() => onQty(item.available_qty)}>
                            Semua ({item.available_qty})
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
