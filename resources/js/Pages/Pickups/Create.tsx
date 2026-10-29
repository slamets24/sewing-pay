import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { QtyStepper } from '@/components/sewing/qty-stepper';
import { PageIntro, Section } from '@/components/sewing/section';
import { StickyBar } from '@/components/sewing/sticky-bar';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PickupCart } from '@/domain/production/pickup-cart';
import AppLayout from '@/layouts/app-layout';
import { dueLabel, formatIdr, variantLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { FloorActions } from '@/services/floor-actions';
import type { TailorRecord, WorkOrderItemRecord } from '@/types/sewing';
import { Link, router } from '@inertiajs/react';
import { Check, ClipboardList, HandPlatter, Search, ShoppingBasket, UserRound, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type CreateProps = {
    tailors: TailorRecord[];
    availableItems: WorkOrderItemRecord[];
    presetTailorId: number | null;
};

export default function PickupCreate({ tailors, availableItems, presetTailorId }: CreateProps) {
    const [cart, setCart] = useState(() => PickupCart.start(tailors.find((tailor) => tailor.id === presetTailorId) ?? null));
    const [query, setQuery] = useState('');
    const [tailorQuery, setTailorQuery] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => setCart((current) => current.syncWith(availableItems)), [availableItems]);

    const filteredTailors = useMemo(() => {
        const needle = tailorQuery.toLowerCase().trim();

        return needle ? tailors.filter((t) => `${t.name} ${t.code ?? ''}`.toLowerCase().includes(needle)) : tailors;
    }, [tailors, tailorQuery]);

    const groups = useMemo(() => {
        const needle = query.toLowerCase().trim();
        const matches = availableItems.filter((item) =>
            needle ? `${item.article_name} ${item.color ?? ''} ${item.size ?? ''} ${item.work_order_number ?? ''}`.toLowerCase().includes(needle) : true,
        );
        const byWorkOrder = new Map<string, WorkOrderItemRecord[]>();

        for (const item of matches) {
            const key = item.work_order_number ?? '-';
            byWorkOrder.set(key, [...(byWorkOrder.get(key) ?? []), item]);
        }

        return [...byWorkOrder.entries()];
    }, [availableItems, query]);

    const submit = () =>
        router.post(route('pickups.store'), cart.toPayload(), {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onError: (errors) => toast.error(FloorActions.firstError(errors)),
        });

    return (
        <AppLayout title="Ambil barang">
            <PageIntro
                actions={
                    <Button asChild className="gap-1.5 font-bold shadow-sm">
                        <Link href={route('desk.index', cart.tailor ? { tailor: cart.tailor.id } : undefined)}>
                            <Zap className="size-4" />
                            Loket Cepat (Setor & Ambil)
                        </Link>
                    </Button>
                }
            >
                Pilih penjahit, lalu barang yang dibawa. Satu kali ambil boleh beberapa artikel dari WO berbeda.
            </PageIntro>

            <div className="flex flex-col gap-5 pb-40 lg:pb-28">
                <Section title="1. Siapa yang ambil?" icon={UserRound}>
                    {tailors.length === 0 ? (
                        <EmptyState>Belum ada penjahit aktif. Owner bisa menambahkannya di menu Penjahit.</EmptyState>
                    ) : (
                        <>
                            {tailors.length > 6 && (
                                <div className="relative mb-3">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={tailorQuery}
                                        onChange={(event) => setTailorQuery(event.target.value)}
                                        placeholder="Cari nama atau kode penjahit (50 penjahit)..."
                                        className="pl-9"
                                    />
                                </div>
                            )}

                            {filteredTailors.length === 0 ? (
                                <EmptyState>Tidak ada penjahit yang cocok dengan "{tailorQuery}".</EmptyState>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                    {filteredTailors.map((tailor) => {
                                        const selected = cart.tailor?.id === tailor.id;

                                        return (
                                            <button
                                                key={tailor.id}
                                                type="button"
                                                onClick={() => setCart(cart.withTailor(selected ? null : tailor))}
                                                aria-pressed={selected}
                                                className={cn(
                                                    'flex min-h-16 flex-col items-start justify-center gap-1 rounded-lg border-2 bg-card px-3 py-2 text-left transition-colors focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none',
                                                    selected ? 'border-primary bg-primary/20' : 'hover:border-foreground/40',
                                                )}
                                            >
                                                <span className="flex w-full items-center justify-between gap-2 text-base font-bold">
                                                    {tailor.name}
                                                    {selected && <Check className="size-5 shrink-0" />}
                                                </span>
                                                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    {tailor.code}
                                                    {tailor.type === 'makloon' && <ToneBadge tone="qc">Makloon</ToneBadge>}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </Section>

                <Section title="2. Barang yang dibawa" icon={ShoppingBasket} description="Hanya barang yang sudah ada di gudang yang muncul di sini.">
                    <div className="mb-4 flex flex-col gap-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
                            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari artikel, warna, atau nomor WO…" className="pl-10" />
                        </div>
                    </div>

                    {availableItems.length === 0 ? (
                        <EmptyState className="text-base">
                            Gudang kosong. Catat dulu hancaan yang masuk di halaman WO.
                            <Button asChild variant="outline">
                                <Link href={route('work-orders.index')}>
                                    <ClipboardList />
                                    Buka WO
                                </Link>
                            </Button>
                        </EmptyState>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {groups.map(([number, items]) => (
                                <div key={number} className="flex flex-col gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-display text-xl font-bold">{number}</h3>
                                        {items[0].due_at && <ToneBadge tone="neutral">{dueLabel(items[0].due_at)}</ToneBadge>}
                                    </div>
                                    {items.map((item) => (
                                        <ItemRow key={item.id} item={item} qty={cart.qtyOf(item.id)} onQty={(qty) => setCart(cart.withQty(item, qty))} />
                                    ))}
                                </div>
                            ))}
                            {groups.length === 0 && <EmptyState>Tidak ada barang yang cocok dengan pencarian.</EmptyState>}
                        </div>
                    )}
                </Section>

                <Section title="3. Keterangan (opsional)" icon={ClipboardList}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="Tanggal ambil — isi kalau mencatat mundur" htmlFor="picked-at">
                            <Input id="picked-at" type="datetime-local" value={cart.pickedAt} onChange={(event) => setCart(cart.withPickedAt(event.target.value))} />
                        </FormField>
                        <FormField label="Catatan" htmlFor="pickup-notes">
                            <Input id="pickup-notes" value={cart.notes} onChange={(event) => setCart(cart.withNotes(event.target.value))} />
                        </FormField>
                    </div>
                </Section>
            </div>

            <StickyBar
                title={`${cart.tailor ? cart.tailor.name : 'Pilih penjahit'} · ${cart.totalQty} pcs`}
                subtitle={`${cart.lines.length} barang${cart.tailor ? (cart.isMakloon ? ' · makloon (tidak masuk gaji)' : ` · perkiraan upah ${formatIdr(cart.estimatedWage)}`) : ''}`}
            >
                {cart.lines.length > 0 && (
                    <Button variant="outline" onClick={() => setCart(PickupCart.start(cart.tailor))}>
                        <X />
                        Kosongkan
                    </Button>
                )}
                <Button size="lg" onClick={submit} disabled={!cart.isReady || processing}>
                    <HandPlatter />
                    Simpan ambil
                </Button>
            </StickyBar>
        </AppLayout>
    );
}

function ItemRow({ item, qty, onQty }: { item: WorkOrderItemRecord; qty: number; onQty: (qty: number) => void }) {
    const selected = qty > 0;

    return (
        <div className={cn('flex flex-wrap items-center gap-3 rounded-lg border-2 bg-card p-3', selected && 'border-primary bg-primary/10')}>
            <div className="min-w-0 flex-1">
                <p className="text-lg font-bold">{item.article_name}</p>
                <p className="text-base">{variantLabel(item.color, item.size)}</p>
                <p className="text-sm text-muted-foreground">
                    Di gudang: <span className="font-bold text-stage-ready">{item.available_qty} pcs</span>
                    {item.sewing_rate > 0 ? ` · tarif ${formatIdr(item.sewing_rate)}` : ' · tarif belum diisi'}
                </p>
            </div>
            {selected ? (
                <div className="flex items-center gap-2">
                    <QtyStepper value={qty} min={0} max={item.available_qty} onChange={onQty} label={`Jumlah ${item.article_name}`} />
                    {qty < item.available_qty && (
                        <Button variant="outline" onClick={() => onQty(item.available_qty)}>
                            Semua
                        </Button>
                    )}
                </div>
            ) : (
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onQty(1)}>
                        Ambil 1
                    </Button>
                    {item.available_qty > 1 && <Button onClick={() => onQty(item.available_qty)}>Semua ({item.available_qty})</Button>}
                </div>
            )}
        </div>
    );
}
