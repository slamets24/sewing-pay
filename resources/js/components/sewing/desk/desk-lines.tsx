import { ConfirmButton } from '@/components/confirm-button';
import { ReportDefectSheet } from '@/components/sewing/desk/defect-sheets';
import { QtyStepper } from '@/components/sewing/qty-stepper';
import { Button } from '@/components/ui/button';
import { variantLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { floorActions } from '@/services/floor-actions';
import type { PickupItemRecord, RevisionPartRecord, WorkOrderItemRecord } from '@/types/sewing';
import { PackageCheck, Shirt, TriangleAlert, Undo2 } from 'lucide-react';
import { useState } from 'react';

export function DeskHoldingLine({ item, revisionParts }: { item: PickupItemRecord; revisionParts: RevisionPartRecord[] }) {
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
                    <p className="font-display text-2xl leading-none font-black tabular text-emerald-600 dark:text-emerald-400">{deliverableQty}</p>
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
                        <Button
                            size="sm"
                            onClick={() => deliver(custom)}
                            disabled={busy}
                            className="h-8.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
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

export function DeskItemRow({ item, qty, onQty }: { item: WorkOrderItemRecord; qty: number; onQty: (qty: number) => void }) {
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
                </p>
            </div>

            {selected ? (
                <div className="flex items-center gap-2">
                    <QtyStepper value={qty} min={0} max={item.available_qty} onChange={onQty} label={`Jumlah ${item.article_name}`} />
                    {qty < item.available_qty && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs font-semibold"
                            onClick={() => onQty(item.available_qty)}
                        >
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
