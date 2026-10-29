import { ConfirmButton } from '@/components/confirm-button';
import { QtyStepper } from '@/components/sewing/qty-stepper';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { variantLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { floorActions } from '@/services/floor-actions';
import type { BoardRow, PickupItemRecord } from '@/types/sewing';
import { Link } from '@inertiajs/react';
import { HandPlatter, PackageCheck, TriangleAlert, Undo2, Zap } from 'lucide-react';
import { useState } from 'react';

/** One tailor and the pieces they hold. With `actions`, each line gets one-tap "setor" buttons. */
export function HoldingCard({ row, actions = false }: { row: BoardRow; actions?: boolean }) {
    const [batchBusy, setBatchBusy] = useState(false);
    const initials = row.tailor.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join('');

    return (
        <article className="flex flex-col overflow-hidden rounded-lg border-2 bg-card">
            <header className="flex items-center gap-3 border-b bg-muted/60 px-4 py-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">{initials}</span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">{row.tailor.name}</p>
                    <p className="text-sm text-muted-foreground">
                        Memegang <span className="font-bold text-stage-sewing">{row.remaining_qty} pcs</span> · {row.items.length} barang
                    </p>
                </div>
                {row.tailor.type === 'makloon' && <ToneBadge tone="qc">Makloon</ToneBadge>}
            </header>

            {actions && row.remaining_qty > 0 && (
                <div className="flex items-center justify-between gap-2 border-b bg-emerald-500/10 px-4 py-2">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        {row.items.length > 1 ? `Semua ${row.items.length} barang` : '1 barang'}
                    </span>
                    <Button
                        size="sm"
                        disabled={batchBusy}
                        onClick={() =>
                            floorActions.send(
                                'post',
                                route('deliveries.batch-tailor', row.tailor.id),
                                {},
                                { onStart: () => setBatchBusy(true), onFinish: () => setBatchBusy(false) },
                            )
                        }
                        className="h-8 gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                        <Zap className="size-3.5" />
                        Setor Semua ({row.remaining_qty} pcs)
                    </Button>
                </div>
            )}

            <ul className="flex flex-col divide-y">
                {row.items.map((item) => (
                    <HoldingLine key={item.id} item={item} actions={actions} />
                ))}
            </ul>

            {actions && (
                <footer className="mt-auto flex gap-2 border-t px-4 py-3">
                    <Button asChild variant="outline" className="flex-1">
                        <Link href={route('desk.index', { tailor: row.tailor.id })}>
                            <Zap />
                            Buka di Loket
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" className="flex-1">
                        <Link href={route('pickups.create', { tailor: row.tailor.id })}>
                            <HandPlatter />
                            Ambil lagi
                        </Link>
                    </Button>
                </footer>
            )}
        </article>
    );
}

function HoldingLine({ item, actions }: { item: PickupItemRecord; actions: boolean }) {
    const [custom, setCustom] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);

    const deliver = (qty: number) =>
        floorActions.send('post', route('deliveries.store', item.id), { qty }, { onStart: () => setBusy(true), onFinish: () => setBusy(false), onSuccess: () => setCustom(null) });

    return (
        <li className="flex flex-col gap-3 px-4 py-3">
            <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-base font-bold">{item.article_name}</p>
                    <p className="text-base">{variantLabel(item.color, item.size)}</p>
                    <p className="text-sm text-muted-foreground">
                        {item.work_order_number} · diambil {item.age_days === 0 ? 'hari ini' : `${item.age_days} hari lalu`}
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-display text-3xl leading-none font-bold tabular">{item.remaining_qty}</p>
                    <p className="text-sm text-muted-foreground">sisa dari {item.qty}</p>
                </div>
            </div>

            {actions && (
                <div className="flex flex-wrap items-center gap-2">
                    {custom === null ? (
                        <>
                            <Button onClick={() => deliver(item.remaining_qty)} disabled={busy} className="flex-1 sm:flex-none">
                                <PackageCheck />
                                Setor semua ({item.remaining_qty})
                            </Button>
                            {item.remaining_qty > 1 && (
                                <Button variant="outline" onClick={() => setCustom(1)} disabled={busy}>
                                    Sebagian
                                </Button>
                            )}
                            <Button asChild variant="outline" disabled={busy}>
                                <Link href={route('revisions.index', { lapor: item.id })}>
                                    <TriangleAlert />
                                    Cacat bahan
                                </Link>
                            </Button>
                            {item.can_cancel && (
                                <ConfirmButton
                                    confirmLabel="Ya, batalkan"
                                    idleClassName="text-muted-foreground"
                                    disabled={busy}
                                    onConfirm={() => floorActions.send('post', route('pickup-items.cancel', item.id))}
                                >
                                    <Undo2 />
                                    Salah ambil
                                </ConfirmButton>
                            )}
                        </>
                    ) : (
                        <>
                            <QtyStepper value={custom} min={1} max={item.remaining_qty} onChange={setCustom} label="Jumlah setor" />
                            <Button onClick={() => deliver(custom)} disabled={busy}>
                                Setor {custom}
                            </Button>
                            <Button variant="ghost" onClick={() => setCustom(null)}>
                                Batal
                            </Button>
                        </>
                    )}
                </div>
            )}
        </li>
    );
}

export function holdingGridClass(className?: string) {
    return cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3', className);
}
