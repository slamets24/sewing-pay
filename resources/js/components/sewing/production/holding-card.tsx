import { Card } from '@/components/ui/card';
import { QtyStepper } from '@/components/sewing/qty-stepper';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { variantLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { floorActions } from '@/services/floor-actions';
import type { BoardRow, PickupItemRecord } from '@/types/sewing';
import { router } from '@inertiajs/react';
import { Ellipsis, HandPlatter, PackageCheck, TriangleAlert, Undo2, Zap } from 'lucide-react';
import { useState } from 'react';

/** One tailor and the pieces they hold. With `actions`, each line gets a one-tap "Setor" plus a small menu for the rest. */
export function HoldingCard({ row, actions = false }: { row: BoardRow; actions?: boolean }) {
    const [batchBusy, setBatchBusy] = useState(false);

    return (
        <Card asChild>
            <article className="flex flex-col overflow-hidden border bg-card ">
                <header className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate font-bold">
                            <span className="truncate">{row.tailor.name}</span>
                            {row.tailor.type === 'makloon' && <ToneBadge tone="qc">Makloon</ToneBadge>}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Memegang <span className="font-bold text-stage-sewing">{row.remaining_qty} pcs</span> · {row.items.length} barang
                        </p>
                    </div>

                    {actions && row.items.length > 1 && row.remaining_qty > 0 && (
                        <Button
                            size="sm"
                            disabled={batchBusy}
                            onClick={() =>
                                floorActions.send('post', route('deliveries.batch-tailor', row.tailor.id), {}, { onStart: () => setBatchBusy(true), onFinish: () => setBatchBusy(false) })
                            }
                        >
                            <PackageCheck />
                            Setor semua
                        </Button>
                    )}
                    {actions && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-9" aria-label={`Menu ${row.tailor.name}`}>
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => router.visit(route('desk.index', { tailor: row.tailor.id }))}>
                                    <Zap />
                                    Buka di Loket
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => router.visit(route('pickups.create', { tailor: row.tailor.id }))}>
                                    <HandPlatter />
                                    Ambil lagi
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </header>

                <ul className="flex flex-col divide-y">
                    {row.items.map((item) => (
                        <HoldingLine key={item.id} item={item} actions={actions} />
                    ))}
                </ul>
            </article>
        </Card>
    );
}

type LineMode = 'idle' | 'partial' | 'cancel';

/** Two rows: what and how many / where from and the actions. */
function HoldingLine({ item, actions }: { item: PickupItemRecord; actions: boolean }) {
    const [mode, setMode] = useState<LineMode>('idle');
    const [partialQty, setPartialQty] = useState(1);
    const [busy, setBusy] = useState(false);
    const hooks = { onStart: () => setBusy(true), onFinish: () => setBusy(false), onSuccess: () => setMode('idle') };

    const deliver = (qty: number) => floorActions.send('post', route('deliveries.store', item.id), { qty }, hooks);

    return (
        <li className="flex flex-col gap-2 px-3 py-2.5">
            <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 truncate font-bold">
                    {item.article_name}
                    <span className="font-medium text-muted-foreground"> · {variantLabel(item.color, item.size)}</span>
                </p>
                <p className="shrink-0 text-sm text-muted-foreground tabular">
                    <span className="font-display text-xl leading-none font-bold text-foreground">{item.remaining_qty}</span>
                    {item.remaining_qty !== item.qty && ` / ${item.qty}`} pcs
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {item.work_order_number} · {item.age_days === 0 ? 'diambil hari ini' : `diambil ${item.age_days} hari lalu`}
                </p>

                {actions && mode === 'idle' && (
                    <div className="flex items-center gap-1">
                        <Button size="sm" onClick={() => deliver(item.remaining_qty)} disabled={busy || item.remaining_qty <= 0}>
                            <PackageCheck />
                            Setor {item.remaining_qty}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="size-8" aria-label="Aksi lain" disabled={busy}>
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {item.remaining_qty > 1 && (
                                    <DropdownMenuItem onSelect={() => setMode('partial')}>
                                        <PackageCheck />
                                        Setor sebagian
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => router.visit(route('revisions.index', { lapor: item.id }))}>
                                    <TriangleAlert />
                                    Cacat bahan
                                </DropdownMenuItem>
                                {item.can_cancel && (
                                    <DropdownMenuItem onSelect={() => setMode('cancel')} className="text-destructive">
                                        <Undo2 />
                                        Salah ambil
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            {actions && mode === 'partial' && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-2">
                    <QtyStepper value={partialQty} min={1} max={item.remaining_qty} onChange={setPartialQty} label="Jumlah setor" />
                    <Button size="sm" onClick={() => deliver(partialQty)} disabled={busy}>
                        Setor {partialQty}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>
                        Batal
                    </Button>
                </div>
            )}

            {actions && mode === 'cancel' && (
                <div className={cn('flex flex-wrap items-center gap-2 rounded-lg bg-destructive/8 p-2 text-sm')}>
                    <span className="flex-1 font-semibold">Batalkan pengambilan ini? Barang kembali ke gudang.</span>
                    <Button size="sm" variant="destructive" disabled={busy} onClick={() => floorActions.send('post', route('pickup-items.cancel', item.id), {}, hooks)}>
                        Ya, batalkan
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>
                        Tidak
                    </Button>
                </div>
            )}
        </li>
    );
}

export function holdingGridClass(className?: string) {
    return cn('grid gap-3 md:grid-cols-2 xl:grid-cols-3', className);
}
