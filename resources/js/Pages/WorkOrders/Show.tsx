import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
    ReceiveFromVendorSheet,
    ReceiveHancaanSheet,
    SendToVendorSheet,
    TransferCuttingSheet,
} from '@/components/sewing/work-order/item-sheets';
import { DeleteWorkOrderSheet, PurgeWorkOrderSheet, type PurgePreview } from '@/components/sewing/work-order/purge-sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { canStepBack, StepBackSheet } from '@/components/sewing/work-order/step-back-sheet';
import { WaReportButton } from '@/components/sewing/work-order/wa-report-button';
import { WorkOrderItemFilter } from '@/domain/work-order/item-filter';
import { workOrderWaText } from '@/domain/work-order/wa-report';
import { QtyBar } from '@/components/sewing/qty-bar';
import { PageIntro, Section } from '@/components/sewing/section';
import { SearchBox } from '@/components/sewing/master/search-box';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { useCan } from '@/lib/abilities';
import { dueLabel, formatDate, formatDateTime, variantLabel } from '@/lib/format';
import { ToneStyle, type Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { floorActions } from '@/services/floor-actions';
import type { CatalogArticle, CuttingReceiptRecord, HancaanReceiptRecord, VendorJobRecord, WorkOrderDetail, WorkOrderItemRecord } from '@/types/sewing';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Building2, Ellipsis, Factory, Hourglass, PackageCheck, CheckCircle2, CheckSquare, ClipboardList, History, HandPlatter, PackagePlus, Pencil, Plus, Printer, Scissors, Shirt, Trash2, Truck, Undo2, Warehouse, Wrench, X, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

type ShowProps = {
    workOrder: WorkOrderDetail;
    receipts: HancaanReceiptRecord[];
    cuttingReceipts?: CuttingReceiptRecord[];
    articles: CatalogArticle[];
    purge?: PurgePreview | null;
    vendorJobs?: VendorJobRecord[];
    vendorNames?: string[];
};

export default function WorkOrderShow({ workOrder, receipts, cuttingReceipts = [], articles, purge = null, vendorJobs = [], vendorNames = [] }: ShowProps) {
    const [dangerSheet, setDangerSheet] = useState<'delete' | 'purge' | null>(null);
    const can = useCan();
    const canVendor = can('vendor-process.manage');
    const due = dueLabel(workOrder.due_at);
    const hasPrint = workOrder.items.some((item) => !item.is_polosan);

    // Multi-select state for fast batch transfers
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Search & stage filter for long WOs (100+ lines): find the article at the bottom without scrolling.
    const [filter, setFilter] = useState(() => new WorkOrderItemFilter());
    const visibleItems = useMemo(() => filter.apply(workOrder.items), [filter, workOrder.items]);
    const stageOptions = useMemo(() => filter.stageOptions(workOrder.items), [filter, workOrder.items]);

    // "Pilih" works on what is on screen, so search → pilih → kirim selects exactly the lines found.
    const activeItems = visibleItems.filter((i) => i.delivered_qty < i.planned_qty);
    const allActiveSelected = activeItems.length > 0 && activeItems.every((i) => selectedIds.includes(i.id));

    const toggleSelectAll = () => {
        const visibleIds = activeItems.map((i) => i.id);

        setSelectedIds((prev) => (allActiveSelected ? prev.filter((id) => !visibleIds.includes(id)) : [...new Set([...prev, ...visibleIds])]));
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
    const selectedVendorSendCandidates = canVendor ? selectedItems.filter((i) => (i.vendor_waiting_qty ?? 0) > 0) : [];
    const totalVendorSendPieces = selectedVendorSendCandidates.reduce((sum, i) => sum + (i.vendor_waiting_qty ?? 0), 0);
    const selectedVendorReceiveCandidates = canVendor ? selectedItems.filter((i) => (i.open_vendor_jobs ?? []).length > 0) : [];
    const totalVendorReceivePieces = selectedVendorReceiveCandidates.reduce((sum, i) => sum + (i.vendor_qty ?? 0), 0);
    const hiddenSelectedCount = selectedIds.filter((id) => !visibleItems.some((item) => item.id === id)).length;

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
                        <WaReportButton text={workOrderWaText(workOrder)} />
                        {can('activity-logs.view') && (
                            <Button asChild variant="outline">
                                <Link href={route('activity-logs.index', { wo: workOrder.id })}>
                                    <History />
                                    Riwayat
                                </Link>
                            </Button>
                        )}
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
                <Card asChild>
                    <div className="flex flex-col gap-4 border border-border bg-card p-4 sm:p-5 ">
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
                                <Button asChild variant="secondary" className="">
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
                </Card>

                <Section
                    title="Rincian artikel"
                    icon={PackagePlus}
                    description={filter.isActive ? `${visibleItems.length} dari ${workOrder.items.length} artikel` : `${workOrder.items.length} artikel`}
                    // Visible overflow so the search bar below can stick under the page header while scrolling.
                    className="overflow-visible"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
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
                    {/* Sticks under the page header, so search and "Pilih" stay in reach deep in a long WO. */}
                    <div className="sticky top-14 z-10 -mx-5 -mt-4 mb-3 flex flex-col gap-2 border-b border-border/60 bg-card/95 px-5 py-3 backdrop-blur lg:top-[5.25rem]">
                        <div className="flex gap-2">
                            <SearchBox
                                value={filter.query}
                                onChange={(query) => setFilter(filter.withQuery(query))}
                                placeholder="Cari artikel, warna…"
                                label="Cari artikel di WO ini"
                                className="flex-1"
                            />
                            {activeItems.length > 0 && (
                                <Button type="button" variant={allActiveSelected ? 'secondary' : 'outline'} onClick={toggleSelectAll} className="shrink-0 gap-1.5 font-semibold" aria-pressed={allActiveSelected}>
                                    <CheckSquare className="size-4" />
                                    <span className="hidden sm:inline">{allActiveSelected ? 'Batal pilih' : filter.isActive ? 'Pilih hasil' : 'Pilih aktif'}</span>
                                    <span className="rounded-full bg-foreground/10 px-1.5 text-xs tabular">{activeItems.length}</span>
                                </Button>
                            )}
                        </div>
                        {stageOptions.length > 2 && (
                            <div role="group" aria-label="Saring tahap" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
                                {stageOptions.map((option) => {
                                    const active = option.value === filter.stage;

                                    return (
                                        <Button variant="outline"
                                            key={option.value}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => setFilter(filter.withStage(option.value))}
                                            className={cn('h-auto whitespace-normal',
                                                'inline-flex h-8 shrink-0 items-center gap-1.5 border px-3 text-sm font-semibold transition-colors',
                                                active ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card text-foreground hover:bg-accent',
                                            )}
                                        >
                                            {option.label}
                                            <span className={cn('rounded-full px-1.5 text-xs tabular', active ? 'bg-white/20' : 'bg-muted')}>{option.count}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {visibleItems.length === 0 ? (
                        <EmptyState className="text-base">
                            Tidak ada artikel yang cocok.
                            <Button variant="outline" onClick={() => setFilter(new WorkOrderItemFilter())}>
                                Tampilkan semua
                            </Button>
                        </EmptyState>
                    ) : (
                        /* Phone: one card per row. Tablet / laptop: two cards side by side. */
                        <div className="grid gap-3 md:grid-cols-2">
                            {visibleItems.map((item) => (
                                <ItemRow
                                    key={item.id}
                                    item={item}
                                    workOrderId={workOrder.id}
                                    vendorNames={vendorNames}
                                    canVendor={canVendor}
                                    selected={selectedIds.includes(item.id)}
                                    onToggle={() => toggleItem(item.id)}
                                />
                            ))}
                        </div>
                    )}
                </Section>

                {selectedIds.length > 0 && (
                    // One slim row above the phone menu: [batal] jumlah dipilih … [aksi + pcs]. Desktop: pinned to the bottom.
                    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-card/95 px-3 py-2 shadow-[0_-4px_12px_rgb(0_0_0/0.08)] backdrop-blur lg:bottom-0 lg:left-[17rem]">
                        <div className="mx-auto flex max-w-6xl items-center gap-2">
                            <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0 text-muted-foreground" onClick={() => setSelectedIds([])} aria-label="Batal pilih">
                                <X className="size-5" />
                            </Button>
                            <div className="min-w-0 flex-1 leading-tight">
                                <p className="truncate font-bold">{selectedIds.length} dipilih</p>
                                {hiddenSelectedCount > 0 ? (
                                    <p className="truncate text-xs text-muted-foreground">{hiddenSelectedCount} di luar pencarian</p>
                                ) : (
                                    selectedCuttingCandidates.length === 0 &&
                                    selectedWarehouseCandidates.length === 0 &&
                                    selectedVendorSendCandidates.length === 0 &&
                                    selectedVendorReceiveCandidates.length === 0 && <p className="truncate text-xs text-muted-foreground">Tidak ada yang bisa dipindah</p>
                                )}
                            </div>

                            {selectedCuttingCandidates.length > 0 && (
                                <BatchTransferCuttingSheet
                                    workOrderId={workOrder.id}
                                    items={selectedCuttingCandidates}
                                    onSuccess={() => setSelectedIds([])}
                                    trigger={
                                        <Button variant={selectedWarehouseCandidates.length > 0 ? 'outline' : 'default'} className="h-10 shrink-0 gap-1.5 px-3 font-semibold" aria-label={`Kirim ${totalCuttingPieces} pcs ke cutting`}>
                                            <Scissors className="size-4" />
                                            Cutting
                                            <span className={cn('rounded-full px-1.5 text-xs font-bold tabular', selectedWarehouseCandidates.length > 0 ? 'bg-foreground/10' : 'bg-white/20')}>{totalCuttingPieces}</span>
                                        </Button>
                                    }
                                />
                            )}

                            {selectedVendorSendCandidates.length > 0 && (
                                <SendToVendorSheet
                                    workOrderId={workOrder.id}
                                    items={selectedVendorSendCandidates}
                                    vendorNames={vendorNames}
                                    onSuccess={() => setSelectedIds([])}
                                    trigger={
                                        <Button variant="outline" className="h-10 shrink-0 gap-1.5 px-3 font-semibold" aria-label={`Kirim ${totalVendorSendPieces} pcs ke vendor`}>
                                            <Factory className="size-4" />
                                            Vendor
                                            <span className="rounded-full bg-foreground/10 px-1.5 text-xs font-bold tabular">{totalVendorSendPieces}</span>
                                        </Button>
                                    }
                                />
                            )}

                            {selectedVendorReceiveCandidates.length > 0 && (
                                <ReceiveFromVendorSheet
                                    workOrderId={workOrder.id}
                                    items={selectedVendorReceiveCandidates}
                                    onSuccess={() => setSelectedIds([])}
                                    trigger={
                                        <Button variant="outline" className="h-10 shrink-0 gap-1.5 px-3 font-semibold" aria-label={`Terima ${totalVendorReceivePieces} pcs dari vendor`}>
                                            <PackageCheck className="size-4" />
                                            Dari vendor
                                            <span className="rounded-full bg-foreground/10 px-1.5 text-xs font-bold tabular">{totalVendorReceivePieces}</span>
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
                                        <Button className="h-10 shrink-0 gap-1.5 px-3 font-semibold" aria-label={`${totalWarehousePieces} pcs hancaan masuk gudang`}>
                                            <Warehouse className="size-4" />
                                            Gudang
                                            <span className="rounded-full bg-white/20 px-1.5 text-xs font-bold tabular">{totalWarehousePieces}</span>
                                        </Button>
                                    }
                                />
                            )}
                        </div>
                    </div>
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

                {vendorJobs.length > 0 && (
                    <Section title="Riwayat vendor" icon={Factory} description="Hancaan keluar ke vendor proses dan masuk gudang lagi">
                        <ul className="divide-y">
                            {vendorJobs.map((job) => (
                                <li key={job.id} className="flex flex-wrap items-center gap-3 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold">
                                            {job.qty} pcs · {job.article_name} {variantLabel(job.color, job.size)} → {job.process} di {job.vendor_name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {[
                                                `Kirim ${formatDateTime(job.sent_at)}`,
                                                job.open_qty > 0 ? `masih di vendor ${job.open_qty} pcs` : 'sudah kembali semua',
                                                ...job.returns.map((ret) => `+${ret.qty} masuk ${formatDateTime(ret.returned_at)}`),
                                                job.created_by_name,
                                                job.notes,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                    </div>
                                    {canVendor && job.can_cancel && (
                                        <ConfirmButton size="sm" variant="outline" confirmLabel="Ya, batalkan" onConfirm={() => floorActions.send('delete', route('vendor-jobs.destroy', job.id))}>
                                            <Undo2 className="size-4" />
                                            Batal kirim
                                        </ConfirmButton>
                                    )}
                                    {canVendor && job.returns.length > 0 && (
                                        <ConfirmButton
                                            size="sm"
                                            variant="outline"
                                            confirmLabel={`Ya, batalkan +${job.returns[0].qty}`}
                                            onConfirm={() => floorActions.send('delete', route('vendor-job-returns.destroy', job.returns[0].id))}
                                        >
                                            <Undo2 className="size-4" />
                                            Batal terima
                                        </ConfirmButton>
                                    )}
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
                    <Collapsible className="rounded-lg border bg-card p-4">
                        <CollapsibleTrigger asChild>
                            <Button type="button" variant="ghost"  className="h-auto whitespace-normal cursor-pointer font-semibold before:mr-2 before:content-['▸'] data-[state=open]:before:content-['▾']">Teks WA asli</Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <pre className="mt-3 overflow-x-auto font-mono text-sm whitespace-pre-wrap">{workOrder.source_text}</pre>
                        </CollapsibleContent>
                    </Collapsible>
                )}
                {/* Room for the action bar so the end of the page is not hidden behind it. */}
                {selectedIds.length > 0 && <div className="h-14" aria-hidden />}
            </div>
        </AppLayout>
    );
}

/** Stages shown in the summary; only those holding pieces are rendered. */
const STAGE_FIGURES: { key: string; label: string; icon: LucideIcon; tone: Tone; getValue: (wo: WorkOrderDetail) => number }[] = [
    { key: 'print', label: 'Printing', icon: Printer, tone: 'other', getValue: (wo) => wo.printing_qty },
    { key: 'cut', label: 'Cutting', icon: Scissors, tone: 'primary', getValue: (wo) => wo.cutting_qty },
    { key: 'tunggu-vendor', label: 'Tunggu vendor', icon: Hourglass, tone: 'neutral', getValue: (wo) => wo.vendor_waiting_qty ?? 0 },
    { key: 'vendor', label: 'Di vendor', icon: Factory, tone: 'other', getValue: (wo) => wo.vendor_qty ?? 0 },
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
    { key: 'tunggu-vendor', label: 'Tunggu kirim vendor', abbr: 'TV', icon: Hourglass, tone: 'neutral', getValue: (i) => i.vendor_waiting_qty ?? 0 },
    { key: 'vendor', label: 'Di vendor', abbr: 'VEN', icon: Factory, tone: 'other', getValue: (i) => i.vendor_qty ?? 0 },
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
    workOrderId,
    vendorNames,
    canVendor,
    selected,
    onToggle,
}: {
    item: WorkOrderItemRecord;
    workOrderId: number;
    vendorNames: string[];
    canVendor: boolean;
    selected: boolean;
    onToggle: () => void;
}) {
    const cells = STAGE_CELLS.filter((cell) => {
        const value = cell.getValue(item);
        return cell.key === 'wo' || (typeof value === 'number' && value > 0);
    });
    const isDone = item.planned_qty > 0 && item.delivered_qty >= item.planned_qty;

    return (
        <Card asChild>
            <div
                className={cn(
                    'flex flex-wrap items-center gap-x-2.5 gap-y-1 border bg-card p-3 transition-colors hover:border-foreground/30',
                    selected ? 'border-primary/60 bg-primary/[0.04] ring-2 ring-primary/20' : 'border-border',
                )}
            >
                {/*
                  Row 1: [pilih · nama + varian · status] — the name gets the whole width so colour & size stay readable on phones.
                  Row 2: [ikon tahap · aksi]; on a narrow phone the actions drop to their own line, right-aligned.
                */}
                <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Pilih baris ${item.article_name}`} className="order-1 size-5 shrink-0 cursor-pointer rounded-md" />
                <p className="order-2 min-w-0 flex-1 font-bold leading-tight wrap-anywhere" title={item.barcode_value ? `Barcode ${item.barcode_value}` : 'Belum ada barcode'}>
                    {item.article_name}
                    <span className="font-medium text-muted-foreground"> · {variantLabel(item.color, item.size) || 'Tanpa varian'}</span>
                    {item.is_polosan && <span className="font-medium text-muted-foreground"> · polosan</span>}
                    {(item.processes?.length ?? 0) > 0 && (
                        <span className="font-semibold text-violet-700 dark:text-violet-300" title="Proses di vendor setelah cutting">
                            {' '}· {item.processes!.join(' → ')}
                        </span>
                    )}
                </p>
                <ToneBadge tone={ToneStyle.forStage(item.stage)} className="order-3 hidden shrink-0 px-2 py-0.5 text-[11px] sm:inline-flex">
                    {isDone ? 'Selesai' : item.stage_label}
                </ToneBadge>
                <div className="order-6 ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
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
                    {canVendor && (item.vendor_waiting_qty ?? 0) > 0 && (
                        <SendToVendorSheet
                            workOrderId={workOrderId}
                            items={[item]}
                            vendorNames={vendorNames}
                            trigger={
                                <Button variant="outline" size="sm" className="h-9 gap-1.5 px-3 text-xs font-semibold" aria-label={`Kirim ${item.vendor_waiting_qty} pcs ke vendor`}>
                                    <Factory className="size-3.5" />
                                    <span className="hidden sm:inline md:hidden 2xl:inline">Kirim vendor</span>
                                    <span className="rounded-full bg-foreground/10 px-1.5 text-[11px] font-bold">{item.vendor_waiting_qty}</span>
                                </Button>
                            }
                        />
                    )}
                    {canVendor && (item.open_vendor_jobs ?? []).length > 0 && (
                        <ReceiveFromVendorSheet
                            workOrderId={workOrderId}
                            items={[item]}
                            trigger={
                                <Button size="sm" className="h-9 gap-1.5 px-3 text-xs font-semibold" aria-label={`Terima ${item.vendor_qty} pcs dari vendor`}>
                                    <PackageCheck className="size-3.5" />
                                    <span className="hidden sm:inline md:hidden 2xl:inline">Dari vendor</span>
                                    <span className="rounded-full bg-white/20 px-1.5 text-[11px] font-bold">{item.vendor_qty}</span>
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
                                <Button variant="ghost" size="icon" className="size-9 border text-muted-foreground hover:text-foreground" aria-label="Mundurkan tahap" title="Mundurkan tahap">
                                    <Undo2 className="size-4" />
                                </Button>
                            }
                        />
                    )}
                    <PlannedQtySheet
                        item={item}
                        trigger={
                            <Button variant="ghost" size="icon" className="size-9 border text-muted-foreground hover:text-foreground" aria-label="Ubah qty WO">
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
                <div className="order-4 basis-full" aria-hidden />
                <div className="order-5 flex flex-wrap gap-1 pl-7.5 sm:gap-1.5">
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
        </Card>
    );
}
