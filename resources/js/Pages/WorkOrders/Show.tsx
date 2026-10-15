import { ConfirmButton } from '@/components/confirm-button';
import { EmptyState } from '@/components/empty-state';
import { AddItemSheet, EditWorkOrderSheet, PlannedQtySheet, ReceiveHancaanSheet } from '@/components/sewing/work-order/item-sheets';
import { QtyBar } from '@/components/sewing/qty-bar';
import { PageIntro, Section } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { dueLabel, formatDate, formatDateTime, variantLabel } from '@/lib/format';
import { ToneStyle } from '@/lib/tone';
import { floorActions } from '@/services/floor-actions';
import type { CatalogArticle, HancaanReceiptRecord, WorkOrderDetail, WorkOrderItemRecord } from '@/types/sewing';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Barcode, History, HandPlatter, PackagePlus, Pencil, Plus, Trash2, Warehouse } from 'lucide-react';

type ShowProps = {
    workOrder: WorkOrderDetail;
    receipts: HancaanReceiptRecord[];
    articles: CatalogArticle[];
};

export default function WorkOrderShow({ workOrder, receipts, articles }: ShowProps) {
    const due = dueLabel(workOrder.due_at);

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

            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap gap-2">
                        {workOrder.is_done && <ToneBadge tone="done">Selesai jahit</ToneBadge>}
                        {!workOrder.is_done && due && <ToneBadge tone={workOrder.is_overdue ? 'revision' : 'neutral'}>Deadline {formatDate(workOrder.due_at)} · {due}</ToneBadge>}
                        {workOrder.is_opening_stock && <ToneBadge tone="ready">Stok awal</ToneBadge>}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <Figure label="Rencana" value={workOrder.planned_qty} />
                        <Figure label="Di divisi lain" value={workOrder.pending_qty} tone="other" />
                        <Figure label="Di gudang" value={workOrder.available_qty} tone="ready" />
                        <Figure label="Dijahit" value={workOrder.sewing_qty} tone="sewing" />
                        <Figure label="Selesai" value={workOrder.delivered_qty} tone="done" />
                    </div>
                    {workOrder.hold_qty > 0 && (
                        <p className="rounded-md border border-stage-revision/40 bg-stage-revision/10 px-3 py-2 text-base font-semibold text-stage-revision">
                            {workOrder.hold_qty} pcs dikembalikan penjahit karena cacat bahan — menunggu bahan pengganti, belum bisa diambil.
                        </p>
                    )}
                    <QtyBar breakdown={workOrder} />
                    <div className="flex flex-wrap gap-2">
                        {workOrder.pending_qty > 0 && (
                            <ConfirmButton variant="default" confirmLabel={`Ya, ${workOrder.pending_qty} pcs masuk`} onConfirm={() => floorActions.send('post', route('hancaan-receipts.receive-all', workOrder.id))}>
                                <Warehouse />
                                Semua hancaan masuk gudang
                            </ConfirmButton>
                        )}
                        {workOrder.available_qty > 0 && (
                            <Button asChild variant="secondary">
                                <Link href={route('pickups.create')}>
                                    <HandPlatter />
                                    Penjahit ambil
                                </Link>
                            </Button>
                        )}
                        {workOrder.can_delete && (
                            <ConfirmButton confirmLabel="Ya, hapus WO" idleClassName="text-destructive" onConfirm={() => floorActions.send('delete', route('work-orders.destroy', workOrder.id))}>
                                <Trash2 />
                                Hapus WO
                            </ConfirmButton>
                        )}
                    </div>
                </div>

                <Section
                    title="Rincian artikel"
                    icon={PackagePlus}
                    description="Tekan 'Hancaan masuk' saat barang dari cutting tiba di gudang."
                    actions={
                        <AddItemSheet
                            workOrderId={workOrder.id}
                            articles={articles}
                            trigger={
                                <Button variant="secondary">
                                    <Plus />
                                    Baris
                                </Button>
                            }
                        />
                    }
                >
                    <div className="flex flex-col gap-3">
                        {workOrder.items.map((item) => (
                            <ItemRow key={item.id} item={item} />
                        ))}
                    </div>
                </Section>

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
                                    <ConfirmButton size="sm" confirmLabel="Ya, batalkan" onConfirm={() => floorActions.send('delete', route('hancaan-receipts.destroy', receipt.id))}>
                                        Batalkan
                                    </ConfirmButton>
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

function Figure({ label, value, tone }: { label: string; value: number; tone?: 'other' | 'ready' | 'sewing' | 'done' }) {
    return (
        <div className={`rounded-md border p-3 ${tone ? ToneStyle.soft(tone) : 'bg-muted/50'}`}>
            <p className="text-sm font-semibold">{label}</p>
            <p className="font-display text-3xl font-bold text-foreground tabular">{value}</p>
        </div>
    );
}

function ItemRow({ item }: { item: WorkOrderItemRecord }) {
    return (
        <div className="flex flex-col gap-3 rounded-lg border-2 p-3 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold">{item.article_name}</p>
                    <ToneBadge tone={ToneStyle.forStage(item.stage)}>{item.stage_label}</ToneBadge>
                </div>
                <p className="text-base">{variantLabel(item.color, item.size) || 'Tanpa warna/ukuran'}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Barcode className="size-4" />
                    {item.barcode_value ?? 'Belum ada barcode packingv2'}
                </p>
                {item.hold_qty > 0 && <p className="text-sm font-semibold text-stage-revision">{item.hold_qty} pcs menunggu revisi bahan di gudang</p>}
            </div>

            <dl className="grid grid-cols-3 gap-1 text-center sm:grid-cols-5 lg:w-[28rem]">
                {[
                    ['Rencana', item.planned_qty],
                    ['Divisi lain', item.pending_qty],
                    ['Gudang', item.available_qty],
                    ['Dijahit', item.sewing_qty],
                    ['Selesai', item.delivered_qty],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-md bg-muted/60 px-1 py-1.5">
                        <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
                        <dd className="text-xl font-bold tabular">{value}</dd>
                    </div>
                ))}
            </dl>

            <div className="flex flex-wrap gap-2 lg:w-auto">
                <ReceiveHancaanSheet
                    item={item}
                    trigger={
                        <Button variant={item.pending_qty > 0 ? 'default' : 'outline'} className="flex-1 lg:flex-none">
                            <Warehouse />
                            Hancaan masuk
                        </Button>
                    }
                />
                <PlannedQtySheet
                    item={item}
                    trigger={
                        <Button variant="outline" size="icon" aria-label="Ubah qty rencana">
                            <Pencil />
                        </Button>
                    }
                />
                {item.can_delete && (
                    <ConfirmButton size="icon" confirmLabel={<Trash2 />} aria-label="Hapus baris" onConfirm={() => floorActions.send('delete', route('work-order-items.destroy', item.id))}>
                        <Trash2 className="text-destructive" />
                    </ConfirmButton>
                )}
            </div>
        </div>
    );
}
