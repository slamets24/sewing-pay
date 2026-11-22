import { Card } from '@/components/ui/card';
import { ConfirmButton } from '@/components/confirm-button';
import { QtyStepper } from '@/components/sewing/qty-stepper';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { variantLabel } from '@/lib/format';
import { floorActions, type VisitHooks } from '@/services/floor-actions';
import type { WorkOrderItemRecord } from '@/types/sewing';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Scissors, Shirt, Undo2, Warehouse, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

/** Bisa dimundurkan? Dipakai untuk menampilkan tombol hanya kalau ada yang bisa dimundurkan. */
export function canStepBack(item: WorkOrderItemRecord): boolean {
    const cuttingBack = item.is_polosan ? 0 : Math.max(0, item.cutting_transferred_qty - item.received_qty);
    return (item.step_back_warehouse_qty ?? item.available_qty) > 0 || cuttingBack > 0 || (item.pickups ?? []).some((pickup) => pickup.can_cancel);
}

/** "Mundurkan" satu baris WO: gudang → cutting, cutting → printing, penjahit → gudang. */
export function StepBackSheet({ item, trigger }: { item: WorkOrderItemRecord; trigger: ReactNode }) {
    const [open, setOpen] = useState(false);
    const cuttingBack = item.is_polosan ? 0 : Math.max(0, item.cutting_transferred_qty - item.received_qty);
    const pickups = (item.pickups ?? []).filter((pickup) => pickup.can_cancel);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="text-2xl">Mundurkan tahap</SheetTitle>
                    <SheetDescription className="text-base">
                        {item.article_name} · {variantLabel(item.color, item.size)}. Pilih tahap yang mau dimundurkan satu langkah.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-6">
                    {pickups.length > 0 && (
                        <StepCard
                            icon={Shirt}
                            from="Penjahit"
                            to="Gudang"
                            hint="Salah ambil: seluruh ambilan dikembalikan ke gudang. Ambilan yang sudah ada setoran tidak bisa."
                        >
                            <ul className="flex flex-col gap-2">
                                {pickups.map((pickup) => (
                                    <Card asChild key={pickup.id}>
                                        <li

                                            className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                                        >
                                            <span className="min-w-0 truncate">
                                                <span className="font-semibold">{pickup.tailor_name}</span> · {pickup.qty} pcs
                                            </span>
                                            <ConfirmButton
                                                size="sm"
                                                variant="outline"
                                                confirmLabel="Ya, kembalikan"
                                                onConfirm={() =>
                                                    floorActions.send(
                                                        'post',
                                                        route('pickup-items.cancel', pickup.id),
                                                        {},
                                                        { onSuccess: () => setOpen(false) },
                                                    )
                                                }
                                            >
                                                <Undo2 />
                                                Ke gudang
                                            </ConfirmButton>
                                        </li>
                                    </Card>
                                ))}
                            </ul>
                        </StepCard>
                    )}

                    {(item.step_back_warehouse_qty ?? item.available_qty) > 0 && (
                        <QtyStep
                            icon={Warehouse}
                            from="Gudang"
                            to="Cutting"
                            max={item.step_back_warehouse_qty ?? item.available_qty}
                            hint="Hancaan yang sudah masuk gudang (belum diambil) dikembalikan ke cutting."
                            onSubmit={(qty, hooks) =>
                                floorActions.send(
                                    'post',
                                    route('work-order-items.step-back', item.id),
                                    { to: 'cutting', qty },
                                    { ...hooks, onSuccess: () => setOpen(false) },
                                )
                            }
                        />
                    )}

                    {cuttingBack > 0 && (
                        <QtyStep
                            icon={Scissors}
                            from="Cutting"
                            to="Printing"
                            max={cuttingBack}
                            hint="Kain yang sudah dikirim ke cutting (belum jadi hancaan) dikembalikan ke printing."
                            onSubmit={(qty, hooks) =>
                                floorActions.send(
                                    'post',
                                    route('work-order-items.step-back', item.id),
                                    { to: 'printing', qty },
                                    { ...hooks, onSuccess: () => setOpen(false) },
                                )
                            }
                        />
                    )}

                    <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                        Setoran yang salah dicatat (selesai jahit → penjahit) dibatalkan dari{' '}
                        <Link href={route('deliveries.index')} className="font-semibold text-primary underline-offset-2 hover:underline">
                            Setor Jahitan
                        </Link>
                        . Kirim QC dibatalkan dari halaman Kirim ke QC.
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function StepCard({ icon: Icon, from, to, hint, children }: { icon: LucideIcon; from: string; to: string; hint: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-2.5 rounded-xl border bg-muted/20 p-3">
            <p className="flex items-center gap-2 font-semibold">
                <Icon className="size-4 text-muted-foreground" />
                {from}
                <ArrowLeft className="size-4 rotate-180 text-muted-foreground" />
                {to}
            </p>
            <p className="text-xs text-muted-foreground">{hint}</p>
            {children}
        </section>
    );
}

function QtyStep({
    icon,
    from,
    to,
    max,
    hint,
    onSubmit,
}: {
    icon: LucideIcon;
    from: string;
    to: string;
    max: number;
    hint: string;
    onSubmit: (qty: number, hooks: VisitHooks) => void;
}) {
    const [qty, setQty] = useState(max);
    const [busy, setBusy] = useState(false);

    return (
        <StepCard icon={icon} from={from} to={to} hint={`${hint} Maksimal ${max} pcs.`}>
            <div className="flex flex-wrap items-center gap-2">
                <QtyStepper value={qty} min={1} max={max} onChange={setQty} />
                <Button
                    type="button"
                    variant="outline"
                    disabled={busy || qty < 1 || qty > max}
                    onClick={() => onSubmit(qty, { onStart: () => setBusy(true), onFinish: () => setBusy(false) })}
                >
                    <Undo2 />
                    Mundurkan {qty} pcs
                </Button>
            </div>
        </StepCard>
    );
}
