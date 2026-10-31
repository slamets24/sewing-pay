import { ConfirmButton } from '@/components/confirm-button';
import { EmptyState } from '@/components/empty-state';
import {
    AddItemSheet,
    BatchReceiveHancaanSheet,
    BatchTransferCuttingSheet,
    EditCuttingReceiptSheet,
    EditHancaanReceiptSheet,
    EditWorkOrderSheet,
    PlannedQtySheet,
    ReceiveHancaanSheet,
    TransferCuttingSheet,
} from '@/components/sewing/work-order/item-sheets';
import { QtyBar } from '@/components/sewing/qty-bar';
import { PageIntro, Section } from '@/components/sewing/section';
import { StickyBar } from '@/components/sewing/sticky-bar';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { dueLabel, formatDate, formatDateTime, variantLabel } from '@/lib/format';
import { ToneStyle, type Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { floorActions } from '@/services/floor-actions';
import type { CatalogArticle, CuttingReceiptRecord, HancaanReceiptRecord, WorkOrderDetail, WorkOrderItemRecord } from '@/types/sewing';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Barcode, Building2, CheckCircle2, CheckSquare, ClipboardList, History, HandPlatter, PackagePlus, Pencil, Plus, Printer, Scissors, Shirt, Trash2, Warehouse, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

type ShowProps = {
    workOrder: WorkOrderDetail;
    receipts: HancaanReceiptRecord[];
    cuttingReceipts?: CuttingReceiptRecord[];
    articles: CatalogArticle[];
};

export default function WorkOrderShow({ workOrder, receipts, cuttingReceipts = [], articles }: ShowProps) {
    const due = dueLabel(workOrder.due_at);
    const hasPrint = workOrder.items.some((item) => !item.is_polosan);

    // Multi-select state for fast batch transfers
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const activeItems = workOrder.items.filter((i) => i.delivered_qty < i.planned_qty);
    const allActiveSelected = activeItems.length > 0 && activeItems.every((i) => selectedIds.includes(i.id));

    const toggleSelectAll = () => {
        if (allActiveSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(activeItems.map((i) => i.id));
        }
    };

    const toggleItem = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    // Candidates within selected
    const selectedItems = workOrder.items.filter((i) => selectedIds.includes(i.id));
    const selectedCuttingCandidates = selectedItems.filter((i) => !i.is_polosan && i.printing_qty > 0);
    const totalCuttingPieces = selectedCuttingCandidates.reduce((sum, i) => sum + i.printing_qty, 0);

    const selectedWarehouseCandidates = selectedItems.filter((i) => i.cutting_qty > 0);
    const totalWarehousePieces = selectedWarehouseCandidates.reduce((sum, i) => sum + i.cutting_qty, 0);

    return (
        <AppLayout title={workOrder.number}>
            <PageIntro
                actions={
                    <>
                        <Button asChild variant="outline">
                            <Link href={route('work-orders.index')}>
                                <ArrowLeft />
                                Daftar WO
                            </Link>
                        </Button>
                        <EditWorkOrderSheet
                            workOrder={workOrder}
                            trigger={
                                <Button variant="outline">
                                    <Pencil />
                                    Ubah
                                </Button>
                            }
                        />
                    </>
                }
            >
                {[workOrder.channel, workOrder.category, `Tanggal ${formatDate(workOrder.ordered_at)}`].filter(Boolean).join(' · ')}
            </PageIntro>

            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
                    <div className="flex flex-wrap gap-2">
                        {workOrder.is_done && <ToneBadge tone="done">Selesai jahit</ToneBadge>}
                        {!workOrder.is_done && due && <ToneBadge tone={workOrder.is_overdue ? 'revision' : 'neutral'}>Deadline {formatDate(workOrder.due_at)} · {due}</ToneBadge>}
                        {workOrder.is_opening_stock && <ToneBadge tone="ready">Stok awal</ToneBadge>}
                    </div>
                    <div className={`grid grid-cols-2 gap-2.5 ${hasPrint ? 'sm:grid-cols-4 lg:grid-cols-7' : 'sm:grid-cols-3 lg:grid-cols-6'}`}>
                        <Figure label="WO" value={workOrder.planned_qty} icon={ClipboardList} />
                        {hasPrint && <Figure label="Printing" value={workOrder.printing_qty} tone="other" icon={Printer} />}
                        <Figure label="Cutting" value={workOrder.cutting_qty} tone="primary" icon={Scissors} />
                        <Figure label="Di gudang" value={workOrder.available_qty} tone="ready" icon={Warehouse} />
                        <Figure label="Penjahit" value={workOrder.sewing_internal_qty} tone="sewing" icon={Shirt} />
                        <Figure label="Makloon" value={workOrder.sewing_makloon_qty} tone="qc" icon={Building2} />
                        <Figure label="Selesai" value={workOrder.delivered_qty} tone="done" icon={CheckCircle2} />
                    </div>
                    {workOrder.hold_qty > 0 && (
                        <p className="rounded-xl border border-stage-revision/40 bg-stage-revision/10 px-3.5 py-2.5 text-base font-semibold text-stage-revision">
                            {workOrder.hold_qty} pcs dikembalikan penjahit karena cacat bahan — menunggu bahan pengganti, belum bisa diambil.
                        </p>
                    )}
                    <QtyBar breakdown={workOrder} />
                    <div className="flex flex-wrap gap-2">
                        {hasPrint && workOrder.printing_qty > 0 && (
                            <ConfirmButton variant="outline" className="rounded-xl" confirmLabel={`Ya, ${workOrder.printing_qty} pcs kirim ke cutting`} onConfirm={() => floorActions.send('post', route('cutting-receipts.transfer-all', workOrder.id))}>
                                <Scissors />
                                Semua print kirim ke cutting
                            </ConfirmButton>
                        )}
                        {workOrder.cutting_qty > 0 && (
                            <ConfirmButton variant="default" className="rounded-xl" confirmLabel={`Ya, ${workOrder.cutting_qty} pcs masuk`} onConfirm={() => floorActions.send('post', route('hancaan-receipts.receive-all', workOrder.id))}>
                                <Warehouse />
                                Semua hancaan masuk gudang
                            </ConfirmButton>
                        )}
                        {workOrder.available_qty > 0 && (
                            <Button asChild variant="secondary" className="rounded-xl">
                                <Link href={route('pickups.create')}>
                                    <HandPlatter />
                                    Penjahit ambil
                                </Link>
                            </Button>
                        )}
                        {workOrder.can_delete && (
                            <ConfirmButton confirmLabel="Ya, hapus WO" idleClassName="text-destructive rounded-xl" onConfirm={() => floorActions.send('delete', route('work-orders.destroy', workOrder.id))}>
                                <Trash2 />
                                Hapus WO
                            </ConfirmButton>
                        )}
                    </div>
                </div>

                <Section
                    title="Rincian artikel"
                    icon={PackagePlus}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            {activeItems.length > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleSelectAll}
                                    className="h-9 gap-1.5 text-xs font-semibold"
                                >
                                    <CheckSquare className="size-4" />
                                    <span>{allActiveSelected ? 'Batal pilih semua' : `Pilih aktif (${activeItems.length})`}</span>
                                </Button>
                            )}
                            <AddItemSheet
                                workOrderId={workOrder.id}
                                articles={articles}
                                trigger={
                                    <Button variant="secondary" size="sm" className="h-9">
                                        <Plus className="size-4" />
                                        Baris
                                    </Button>
                                }
                            />
                        </div>
                    }
                >
                    <div className="flex flex-col gap-3">
                        {workOrder.items.map((item) => (
                            <ItemRow
                                key={item.id}
                                item={item}
                                selected={selectedIds.includes(item.id)}
                                onToggle={() => toggleItem(item.id)}
                            />
                        ))}
                    </div>
                </Section>

                {selectedIds.length > 0 && (
                    <StickyBar
                        title={`${selectedIds.length} artikel terpilih`}
                        subtitle={
                            [
                                totalCuttingPieces > 0 ? `${totalCuttingPieces} pcs siap ke cutting` : null,
                                totalWarehousePieces > 0 ? `${totalWarehousePieces} pcs siap ke gudang` : null,
                            ]
                                .filter(Boolean)
                                .join(' · ') || 'Pilih aksi perpindahan di samping'
                        }
                    >
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIds([])}
                            className="h-9 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Batal
                        </Button>

                        {selectedCuttingCandidates.length > 0 && (
                            <BatchTransferCuttingSheet
                                workOrderId={workOrder.id}
                                items={selectedCuttingCandidates}
                                onSuccess={() => setSelectedIds([])}
                                trigger={
                                    <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
                                        <Scissors className="size-3.5" />
                                        <span>Kirim ke cutting</span>
                                        <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[11px] font-bold text-primary">
                                            {totalCuttingPieces} pcs
                                        </span>
                                    </Button>
                                }
                            />
                        )}

                        {selectedWarehouseCandidates.length > 0 && (
                            <BatchReceiveHancaanSheet
                                workOrderId={workOrder.id}
                                items={selectedWarehouseCandidates}
                                onSuccess={() => setSelectedIds([])}
                                trigger={
                                    <Button variant="default" size="sm" className="h-9 gap-1.5 text-xs font-semibold">
                                        <Warehouse className="size-3.5" />
                                        <span>Hancaan masuk gudang</span>
                                        <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[11px] font-bold">
                                            {totalWarehousePieces} pcs
                                        </span>
                                    </Button>
                                }
                            />
                        )}
                    </StickyBar>
                )}

                {hasPrint && cuttingReceipts.length > 0 && (
                    <Section title="Riwayat kirim ke cutting" icon={Scissors}>
                        <ul className="divide-y">
                            {cuttingReceipts.map((receipt) => (
                                <li key={receipt.id} className="flex flex-wrap items-center gap-3 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold">
                                            {receipt.qty} pcs kain · {receipt.article_name} {variantLabel(receipt.color, receipt.size)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {[formatDateTime(receipt.transferred_at), receipt.created_by_name, receipt.notes].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                    <EditCuttingReceiptSheet
                                        receipt={receipt}
                                        trigger={
                                            <Button size="sm" variant="outline">
                                                <Pencil className="size-4" />
                                                Ubah qty
                                            </Button>
                                        }
                                    />
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                <Section title="Riwayat hancaan masuk" icon={History}>
                    {receipts.length === 0 ? (
                        <EmptyState>Belum ada hancaan yang masuk gudang.</EmptyState>
                    ) : (
                        <ul className="divide-y">
                            {receipts.map((receipt) => (
                                <li key={receipt.id} className="flex flex-wrap items-center gap-3 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold">
                                            +{receipt.qty} pcs · {receipt.article_name} {variantLabel(receipt.color, receipt.size)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {[formatDateTime(receipt.received_at), receipt.created_by_name, receipt.notes].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                    <EditHancaanReceiptSheet
                                        receipt={receipt}
                                        trigger={
                                            <Button size="sm" variant="outline">
                                                <Pencil className="size-4" />
                                                Ubah qty
                                            </Button>
                                        }
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                {workOrder.source_text && (
                    <details className="rounded-lg border bg-card p-4">
                        <summary className="cursor-pointer font-semibold">Teks WA asli</summary>
                        <pre className="mt-3 overflow-x-auto font-mono text-sm whitespace-pre-wrap">{workOrder.source_text}</pre>
                    </details>
                )}
            </div>
        </AppLayout>
    );
}

function Figure({ label, value, tone, icon: Icon }: { label: string; value: number; tone?: Tone; icon?: LucideIcon }) {
    return (
        <div className={`flex flex-col justify-between rounded-xl border p-3.5 shadow-2xs ${tone ? ToneStyle.soft(tone) : 'bg-muted/30 border-border'}`}>
            <div className="flex items-center justify-between gap-1 text-xs font-semibold text-muted-foreground">
                <span className="truncate">{label}</span>
                {Icon && <Icon className="size-4 shrink-0 opacity-70" />}
            </div>
            <p className="mt-1 font-display text-2xl font-black text-foreground tabular lg:text-3xl leading-none">{value}</p>
        </div>
    );
}

const STAGE_CELLS: {
    key: string;
    label: string;
    abbr: string;
    icon: LucideIcon;
    tone?: Tone;
    getValue: (item: WorkOrderItemRecord) => number | string;
}[] = [
    { key: 'wo', label: 'WO', abbr: 'WO', icon: ClipboardList, getValue: (i) => i.planned_qty },
    { key: 'print', label: 'Printing', abbr: 'PRI', icon: Printer, tone: 'other', getValue: (i) => (i.is_polosan ? '-' : i.printing_qty) },
    { key: 'cut', label: 'Cutting', abbr: 'CUT', icon: Scissors, tone: 'primary', getValue: (i) => i.cutting_qty },
    { key: 'gudang', label: 'Gudang', abbr: 'GUD', icon: Warehouse, tone: 'ready', getValue: (i) => i.available_qty },
    { key: 'jahit', label: 'Penjahit', abbr: 'JAH', icon: Shirt, tone: 'sewing', getValue: (i) => i.sewing_internal_qty },
    { key: 'makloon', label: 'Makloon', abbr: 'MAK', icon: Building2, tone: 'qc', getValue: (i) => i.sewing_makloon_qty },
    { key: 'selesai', label: 'Selesai', abbr: 'SEL', icon: CheckCircle2, tone: 'done', getValue: (i) => i.delivered_qty },
];

function ItemRow({
    item,
    selected,
    onToggle,
}: {
    item: WorkOrderItemRecord;
    selected: boolean;
    onToggle: () => void;
}) {
    return (
        <div
            className={cn(
                'group flex flex-col gap-3 rounded-xl border bg-card p-3.5 sm:p-4 shadow-2xs transition-colors hover:border-foreground/30 lg:flex-row lg:items-center',
                selected
                    ? 'border-primary/60 bg-primary/[0.04] ring-2 ring-primary/20 shadow-xs'
                    : 'border-border',
            )}
        >
            {/* Batch selection checkbox */}
            <div className="flex shrink-0 items-center pt-0.5 lg:pt-0">
                <Checkbox
                    checked={selected}
                    onCheckedChange={onToggle}
                    aria-label={`Pilih baris ${item.article_name}`}
                    className="size-5 rounded-md cursor-pointer"
                />
            </div>

            {/* Left: Article info */}
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold leading-tight">{item.article_name}</p>
                    <span className="text-sm font-medium text-muted-foreground">{variantLabel(item.color, item.size) || 'Tanpa varian'}</span>
                    <ToneBadge tone={item.is_polosan ? 'neutral' : 'other'} className="text-[11px] px-2 py-0.5">
                        {item.is_polosan ? 'Polosan' : 'Print'}
                    </ToneBadge>
                    <ToneBadge tone={ToneStyle.forStage(item.stage)} className="text-[11px] px-2 py-0.5">
                        {item.stage_label}
                    </ToneBadge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono">
                        <Barcode className="size-3.5" />
                        {item.barcode_value ?? 'Belum ada barcode'}
                    </span>
                    {item.hold_qty > 0 && (
                        <span className="font-semibold text-stage-revision">
                            {item.hold_qty} pcs menunggu revisi di gudang
                        </span>
                    )}
                </div>
            </div>

            {/* Middle: Minimalist Icon-based Stage Indicators */}
            <div className="grid grid-cols-7 gap-1.5 text-center sm:gap-2 lg:w-[26rem] shrink-0">
                {STAGE_CELLS.map((cell) => {
                    const rawVal = cell.getValue(item);
                    const isDash = rawVal === '-';
                    const numVal = typeof rawVal === 'number' ? rawVal : 0;
                    const isActive = numVal > 0 && cell.key !== 'wo';
                    const Icon = cell.icon;

                    return (
                        <div
                            key={cell.key}
                            title={`${cell.label}: ${rawVal} pcs`}
                            className={cn(
                                'flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 transition-all',
                                isDash
                                    ? 'border-transparent bg-muted/20 text-muted-foreground/30'
                                    : isActive
                                      ? cn('shadow-xs', ToneStyle.soft(cell.tone ?? 'neutral'), 'border-current/30 font-semibold')
                                      : 'border-transparent bg-muted/40 text-muted-foreground/50 hover:bg-muted/60',
                            )}
                        >
                            <Icon className={cn('size-3.5 mb-0.5 shrink-0', isActive ? 'opacity-90' : 'opacity-40')} />
                            <span className={cn('font-display text-base font-bold tabular leading-none', isActive ? 'text-foreground' : 'text-muted-foreground/60')}>
                                {rawVal}
                            </span>
                            <span className={cn('text-[9px] font-semibold uppercase tracking-wider mt-0.5 leading-none', isActive ? 'opacity-80' : 'opacity-40')}>
                                {cell.abbr}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap items-center gap-1.5 lg:w-auto shrink-0">
                {!item.is_polosan && item.printing_qty > 0 && (
                    <TransferCuttingSheet
                        item={item}
                        trigger={
                            <Button variant="default" size="sm" className="h-9 gap-1.5 px-3 text-xs font-semibold">
                                <Scissors className="size-3.5" />
                                <span>Kirim ke cutting</span>
                                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[11px] font-bold">{item.printing_qty}</span>
                            </Button>
                        }
                    />
                )}
                {item.cutting_qty > 0 && (
                    <ReceiveHancaanSheet
                        item={item}
                        trigger={
                            <Button
                                variant={!item.is_polosan && item.printing_qty > 0 ? 'outline' : 'default'}
                                size="sm"
                                className="h-9 gap-1.5 px-3 text-xs font-semibold"
                            >
                                <Warehouse className="size-3.5" />
                                <span>Hancaan masuk</span>
                                <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[11px] font-bold">{item.cutting_qty}</span>
                            </Button>
                        }
                    />
                )}
                {item.printing_qty === 0 && item.cutting_qty === 0 && item.available_qty > 0 && (
                    <Button asChild variant="secondary" size="sm" className="h-9 gap-1.5 px-3 text-xs font-semibold">
                        <Link href={route('pickups.create')}>
                            <HandPlatter className="size-3.5" />
                            <span>Ambil</span>
                            <span className="rounded-full bg-foreground/10 px-1.5 py-0.2 text-[11px] font-bold">{item.available_qty}</span>
                        </Link>
                    </Button>
                )}
                {item.delivered_qty >= item.planned_qty && item.planned_qty > 0 && (
                    <span className="flex items-center gap-1 rounded-md bg-stage-done/15 px-2.5 py-1 text-xs font-bold text-stage-done">
                        <CheckCircle2 className="size-3.5" />
                        Selesai
                    </span>
                )}
                <PlannedQtySheet
                    item={item}
                    trigger={
                        <Button variant="ghost" size="icon" className="size-9 rounded-lg border text-muted-foreground hover:text-foreground" aria-label="Ubah qty WO">
                            <Pencil className="size-4" />
                        </Button>
                    }
                />
                {item.can_delete && (
                    <ConfirmButton size="icon" confirmLabel={<Trash2 className="size-4" />} aria-label="Hapus baris" idleClassName="size-9 rounded-lg border border-transparent hover:border-destructive/30 hover:bg-destructive/10 text-destructive" onConfirm={() => floorActions.send('delete', route('work-order-items.destroy', item.id))}>
                        <Trash2 className="size-4" />
                    </ConfirmButton>
                )}
            </div>
        </div>
    );
}
