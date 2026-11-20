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
import { DeleteWorkOrderSheet, PurgeWorkOrderSheet, type PurgePreview } from '@/components/sewing/work-order/purge-sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { canStepBack, StepBackSheet } from '@/components/sewing/work-order/step-back-sheet';
import { WaReportButton } from '@/components/sewing/work-order/wa-report-button';
import { workOrderWaText } from '@/domain/work-order/wa-report';
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
import { ArrowLeft, Building2, Ellipsis, CheckCircle2, CheckSquare, ClipboardList, History, HandPlatter, PackagePlus, Pencil, Plus, Printer, Scissors, Shirt, Trash2, Truck, Undo2, Warehouse, Wrench, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

type ShowProps = {
    workOrder: WorkOrderDetail;
    receipts: HancaanReceiptRecord[];
    cuttingReceipts?: CuttingReceiptRecord[];
    articles: CatalogArticle[];
    purge?: PurgePreview | null;
};

export default function WorkOrderShow({ workOrder, receipts, cuttingReceipts = [], articles, purge = null }: ShowProps) {
    const [dangerSheet, setDangerSheet] = useState<'delete' | 'purge' | null>(null);
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
                        <WaReportButton text={workOrderWaText(workOrder)} publicUrl={workOrder.public_url} />
                        {(workOrder.can_delete || purge) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" aria-label="Aksi lain">
                                        <Ellipsis />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem variant="destructive" onSelect={() => setDangerSheet(workOrder.can_delete ? 'delete' : 'purge')}>
                                        <Trash2 />
                                        {workOrder.can_delete ? 'Hapus WO' : 'Hapus total'}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
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
                        {workOrder.from_packing && <ToneBadge tone="shipped">Dari Packing</ToneBadge>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] sm:gap-2.5">
                        <Figure label="WO" value={workOrder.planned_qty} icon={ClipboardList} />
                        {STAGE_FIGURES.filter((figure) => figure.getValue(workOrder) > 0).map((figure) => (
                            <Figure key={figure.key} label={figure.label} value={figure.getValue(workOrder)} tone={figure.tone} icon={figure.icon} />
                        ))}
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
                    </div>
                    <DeleteWorkOrderSheet open={dangerSheet === 'delete'} onOpenChange={(open) => !open && setDangerSheet(null)} workOrderId={workOrder.id} number={workOrder.number} />
                    {purge && (
                        <PurgeWorkOrderSheet
                            open={dangerSheet === 'purge'}
                            onOpenChange={(open) => !open && setDangerSheet(null)}
                            workOrderId={workOrder.id}
                            number={workOrder.number}
                            fromPacking={Boolean(workOrder.from_packing)}
                            preview={purge}
                        />
                    )}
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
                    {/* Phone: one card per row. Tablet / laptop: two cards side by side. */}
                    <div className="grid gap-3 md:grid-cols-2">
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
                        stackOnPhone
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

/** Stages shown in the summary; only those holding pieces are rendered. */
const STAGE_FIGURES: { key: string; label: string; icon: LucideIcon; tone: Tone; getValue: (wo: WorkOrderDetail) => number }[] = [
    { key: 'print', label: 'Printing', icon: Printer, tone: 'other', getValue: (wo) => wo.printing_qty },
    { key: 'cut', label: 'Cutting', icon: Scissors, tone: 'primary', getValue: (wo) => wo.cutting_qty },
    { key: 'gudang', label: 'Di gudang', icon: Warehouse, tone: 'ready', getValue: (wo) => wo.available_qty },
    { key: 'jahit', label: 'Penjahit', icon: Shirt, tone: 'sewing', getValue: (wo) => wo.sewing_internal_qty },
    { key: 'makloon', label: 'Makloon', icon: Building2, tone: 'qc', getValue: (wo) => wo.sewing_makloon_qty },
    { key: 'selesai', label: 'Selesai jahit', icon: CheckCircle2, tone: 'done', getValue: (wo) => Math.max(0, wo.delivered_qty - wo.qc_qty) },
    { key: 'qc', label: 'Kirim QC', icon: Truck, tone: 'shipped', getValue: (wo) => wo.qc_qty },
];

function Figure({ label, value, tone, icon: Icon }: { label: string; value: number; tone?: Tone; icon?: LucideIcon }) {
    return (
        <div className={`flex flex-col justify-between rounded-xl border p-2.5 shadow-2xs sm:p-3.5 ${tone ? ToneStyle.soft(tone) : 'bg-muted/30 border-border'}`}>
            <div className="flex items-center justify-between gap-1 text-xs font-semibold text-muted-foreground">
                <span className="truncate">{label}</span>
                {Icon && <Icon className="size-4 shrink-0 opacity-70" />}
            </div>
            <p className="mt-1 font-display text-xl font-black text-foreground tabular sm:text-2xl lg:text-3xl leading-none">{value}</p>
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
    { key: 'hold', label: 'Tunggu revisi', abbr: 'REV', icon: Wrench, tone: 'revision', getValue: (i) => i.hold_qty },
    { key: 'selesai', label: 'Selesai jahit', abbr: 'SEL', icon: CheckCircle2, tone: 'done', getValue: (i) => Math.max(0, i.delivered_qty - i.qc_qty) },
    { key: 'qc', label: 'Kirim QC', abbr: 'QC', icon: Truck, tone: 'shipped', getValue: (i) => i.qc_qty },
];

/** One article line in two rows: name + status on top, stage icons (only stages it is in) + actions below. */
function ItemRow({
    item,
    selected,
    onToggle,
}: {
    item: WorkOrderItemRecord;
    selected: boolean;
    onToggle: () => void;
}) {
    const cells = STAGE_CELLS.filter((cell) => {
        const value = cell.getValue(item);
        return cell.key === 'wo' || (typeof value === 'number' && value > 0);
    });
    const isDone = item.planned_qty > 0 && item.delivered_qty >= item.planned_qty;

    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border bg-card p-3 shadow-2xs transition-colors hover:border-foreground/30',
                selected ? 'border-primary/60 bg-primary/[0.04] ring-2 ring-primary/20' : 'border-border',
            )}
        >
            {/*
              Always two rows. Phone & tablet: [pilih · nama · aksi] / [ikon tahap].
              Laptop (wide 2-column cards): [pilih · nama · status] / [ikon tahap · aksi].
            */}
            <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Pilih baris ${item.article_name}`} className="order-1 size-5 shrink-0 cursor-pointer rounded-md" />
            <p className="order-2 min-w-0 flex-1 truncate font-bold leading-tight" title={item.barcode_value ? `Barcode ${item.barcode_value}` : 'Belum ada barcode'}>
                {item.article_name}
                <span className="font-medium text-muted-foreground"> · {variantLabel(item.color, item.size) || 'Tanpa varian'}</span>
                {item.is_polosan && <span className="font-medium text-muted-foreground"> · polosan</span>}
            </p>
            <ToneBadge tone={ToneStyle.forStage(item.stage)} className="order-3 hidden shrink-0 px-2 py-0.5 text-[11px] sm:inline-flex md:hidden xl:inline-flex">
                {isDone ? 'Selesai' : item.stage_label}
            </ToneBadge>
            <div className="order-4 flex shrink-0 items-center gap-1.5 xl:order-6 xl:ml-auto">
                {!item.is_polosan && item.printing_qty > 0 && (
                    <TransferCuttingSheet
                        item={item}
                        trigger={
                            <Button size="sm" className="h-9 gap-1.5 px-3 text-xs font-semibold" aria-label={`Kirim ${item.printing_qty} pcs ke cutting`}>
                                <Scissors className="size-3.5" />
                                <span className="hidden sm:inline md:hidden 2xl:inline">Kirim ke cutting</span>
                                <span className="rounded-full bg-white/20 px-1.5 text-[11px] font-bold">{item.printing_qty}</span>
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
                                aria-label={`${item.cutting_qty} pcs hancaan masuk gudang`}
                            >
                                <Warehouse className="size-3.5" />
                                <span className="hidden sm:inline md:hidden 2xl:inline">Hancaan masuk</span>
                                <span className="rounded-full bg-primary/20 px-1.5 text-[11px] font-bold">{item.cutting_qty}</span>
                            </Button>
                        }
                    />
                )}
                {item.printing_qty === 0 && item.cutting_qty === 0 && item.available_qty > 0 && (
                    <Button asChild variant="secondary" size="sm" className="h-9 gap-1.5 px-3 text-xs font-semibold">
                        <Link href={route('pickups.create')} aria-label={`Ambil ${item.available_qty} pcs`}>
                            <HandPlatter className="size-3.5" />
                            <span className="hidden sm:inline md:hidden 2xl:inline">Ambil</span>
                            <span className="rounded-full bg-foreground/10 px-1.5 text-[11px] font-bold">{item.available_qty}</span>
                        </Link>
                    </Button>
                )}
                {canStepBack(item) && (
                    <StepBackSheet
                        item={item}
                        trigger={
                            <Button variant="ghost" size="icon" className="size-9 rounded-lg border text-muted-foreground hover:text-foreground" aria-label="Mundurkan tahap" title="Mundurkan tahap">
                                <Undo2 className="size-4" />
                            </Button>
                        }
                    />
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
                    <ConfirmButton
                        size="icon"
                        confirmLabel={<Trash2 className="size-4" />}
                        aria-label="Hapus baris"
                        idleClassName="size-9 rounded-lg border border-transparent text-destructive hover:border-destructive/30 hover:bg-destructive/10"
                        onConfirm={() => floorActions.send('delete', route('work-order-items.destroy', item.id))}
                    >
                        <Trash2 className="size-4" />
                    </ConfirmButton>
                )}
            </div>
            <div className="order-5 basis-full xl:order-4" aria-hidden />
            <div className="order-6 flex flex-wrap gap-1 sm:gap-1.5 sm:pl-7.5 xl:order-5">
                {cells.map((cell) => {
                    const value = cell.getValue(item);
                    const isTotal = cell.key === 'wo';
                    const Icon = cell.icon;

                    return (
                        <div
                            key={cell.key}
                            title={`${cell.label}: ${value} pcs`}
                            className={cn(
                                'flex w-10 flex-col items-center justify-center rounded-lg border py-1 text-center sm:w-12',
                                isTotal ? 'border-transparent bg-muted/40 text-muted-foreground' : cn('font-semibold', ToneStyle.soft(cell.tone ?? 'neutral')),
                            )}
                        >
                            <Icon className={cn('size-3.5 shrink-0', isTotal ? 'opacity-50' : 'opacity-90')} />
                            <span className={cn('font-display text-sm leading-tight font-bold tabular', !isTotal && 'text-foreground')}>{value}</span>
                            <span className="text-[9px] leading-none font-semibold tracking-wider uppercase opacity-70">{cell.abbr}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
