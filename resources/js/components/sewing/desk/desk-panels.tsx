import { Card } from '@/components/ui/card';
import { ConfirmButton } from '@/components/confirm-button';
import { Button } from '@/components/ui/button';
import { variantLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { floorActions } from '@/services/floor-actions';
import type { DeliveryRecord, RevisionRecord, TailorRecord } from '@/types/sewing';
import { AlertCircle, ArrowLeftRight, ChevronDown, ClipboardList, Hand, History, Sparkles, Undo2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

/** Tiga angka inti penjahit terpilih, dalam satu baris ringkas. */
export function TailorMetrics({
    remainingQty,
    deliverableQty,
    itemsCount,
    todayQty,
    revisionQty,
    needsAction,
}: {
    remainingQty: number;
    deliverableQty: number;
    itemsCount: number;
    todayQty: number;
    revisionQty: number;
    needsAction: boolean;
}) {
    const holdingHint =
        itemsCount === 0
            ? 'Sudah disetor semua'
            : deliverableQty !== remainingQty
              ? `${deliverableQty} siap · ${remainingQty - deliverableQty} revisi`
              : `${itemsCount} barang`;
    const revisionHint = needsAction ? 'Perlu tindakan' : revisionQty > 0 ? 'Sedang dikerjakan' : 'Bersih';

    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Metric
                icon={<Hand className="size-3.5" />}
                label="Di tangan"
                value={remainingQty}
                hint={holdingHint}
                tone={remainingQty > 0 ? 'amber' : 'muted'}
            />
            <Metric
                icon={<Sparkles className="size-3.5" />}
                label="Setor hari ini"
                value={todayQty}
                hint={todayQty > 0 ? 'pcs disetor' : 'Belum setor'}
                tone={todayQty > 0 ? 'emerald' : 'muted'}
            />
            <Metric
                icon={<AlertCircle className="size-3.5" />}
                label="Revisi"
                value={revisionQty}
                hint={revisionHint}
                tone={needsAction ? 'rose' : revisionQty > 0 ? 'amber' : 'muted'}
            />
        </div>
    );
}

const METRIC_TONES = {
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
    rose: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
    muted: 'border-border/60 bg-muted/20 text-muted-foreground',
} as const;

function Metric({
    icon,
    label,
    value,
    hint,
    tone,
}: {
    icon: ReactNode;
    label: string;
    value: number;
    hint: string;
    tone: keyof typeof METRIC_TONES;
}) {
    return (
        <div className={cn('min-w-0 rounded-xl border px-3 py-2.5', METRIC_TONES[tone])}>
            <p className="flex items-center gap-1 truncate text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                {icon}
                {label}
            </p>
            <p className="mt-0.5 font-display text-2xl leading-none font-black tabular">
                {value}
                <span className="ml-1 text-[11px] font-bold text-muted-foreground">pcs</span>
            </p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p>
        </div>
    );
}

/** Tombol lipat sederhana untuk bagian yang jarang dibuka. */
function FoldToggle({ open, onToggle, icon, children }: { open: boolean; onToggle: () => void; icon: ReactNode; children: ReactNode }) {
    return (
        <Button variant="plain" size="plain"
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
            <span className="flex min-w-0 items-center gap-1.5">
                {icon}
                <span className="truncate">{children}</span>
            </span>
            <ChevronDown className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} />
        </Button>
    );
}

/** Revisi milik penjahit lain yang bisa diserahkan ke penjahit terpilih. Dilipat bawaan. */
export function OtherTailorRevisions({
    revisions: otherTailorRevisions,
    tailor: selectedTailor,
    onReassign: reassignRevision,
}: {
    revisions: RevisionRecord[];
    tailor: TailorRecord;
    onReassign: (rev: RevisionRecord, targetTailorId: number) => void;
}) {
    const [open, setOpen] = useState(false);
    if (otherTailorRevisions.length === 0) return null;

    return (
        <Card asChild>
            <div className="rounded-xl border border-border/70 bg-card px-3 py-1.5 shadow-xs">
                <FoldToggle open={open} onToggle={() => setOpen((v) => !v)} icon={<ArrowLeftRight className="size-3.5 text-primary" />}>
                    Revisi penjahit lain yang bisa dikerjakan ({otherTailorRevisions.length})
                </FoldToggle>
                {open && (
                    <div className="grid gap-2 pt-1 pb-2 sm:grid-cols-2">
                        {otherTailorRevisions.map((rev) => (
                            <div
                                key={rev.id}
                                className="flex items-center justify-between gap-2 rounded-xl bg-muted/20 p-3 text-xs border border-border/60"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-foreground truncate">
                                        {rev.article_name} ({variantLabel(rev.color, rev.size)})
                                    </p>
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
                )}
            </div>
        </Card>
    );
}

/** Setoran terakhir penjahit terpilih, dikelompokkan per WO. Dilipat bawaan. */
export function DeskRecentDeliveries({
    groups: recentDeliveryGroups,
    count,
    tailorName,
}: {
    groups: [string, DeliveryRecord[]][];
    count: number;
    tailorName: string;
}) {
    const [open, setOpen] = useState(false);
    if (recentDeliveryGroups.length === 0) return null;

    return (
        <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-3">
            <FoldToggle open={open} onToggle={() => setOpen((v) => !v)} icon={<History className="size-3.5 text-primary" />}>
                Setoran terakhir {tailorName} ({count})
            </FoldToggle>
            {open && (
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
                                        <Card asChild key={delivery.id}>
                                            <div

                                                className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card p-2.5 shadow-2xs hover:border-border transition-all"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-foreground text-xs truncate">
                                                        {delivery.article_name}{' '}
                                                        <span className="font-normal text-muted-foreground">
                                                            ({variantLabel(delivery.color, delivery.size)})
                                                        </span>
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">{delivery.delivered_at}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="font-display font-black tabular text-emerald-600 text-sm">+{delivery.qty} pcs</span>
                                                    {delivery.can_undo && (
                                                        <ConfirmButton
                                                            confirmLabel="Batalkan"
                                                            idleClassName="text-muted-foreground hover:text-destructive h-7 px-2 text-xs rounded-lg"
                                                            onConfirm={() => floorActions.send('delete', route('deliveries.destroy', delivery.id))}
                                                        >
                                                            <Undo2 className="size-3" />
                                                        </ConfirmButton>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
