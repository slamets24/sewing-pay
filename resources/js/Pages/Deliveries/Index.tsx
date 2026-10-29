import { EmptyState } from '@/components/empty-state';
import { DeliveryList } from '@/components/sewing/production/delivery-list';
import { HoldingCard, holdingGridClass } from '@/components/sewing/production/holding-card';
import { PageIntro, Section } from '@/components/sewing/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import type { BoardRow, DeliveryRecord } from '@/types/sewing';
import { Link } from '@inertiajs/react';
import { HandPlatter, History, Search, Truck, Users, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

type IndexProps = {
    board: BoardRow[];
    recentDeliveries: DeliveryRecord[];
};

export default function DeliveryIndex({ board, recentDeliveries }: IndexProps) {
    const [query, setQuery] = useState('');
    const rows = useMemo(() => {
        const needle = query.toLowerCase().trim();

        return needle
            ? board.filter((row) => `${row.tailor.name} ${row.tailor.code ?? ''} ${row.items.map((item) => item.article_name).join(' ')}`.toLowerCase().includes(needle))
            : board;
    }, [board, query]);

    return (
        <AppLayout title="Setor jahitan">
            <PageIntro
                actions={
                    <>
                        <Button asChild className="gap-1.5 font-bold shadow-sm">
                            <Link href={route('desk.index')}>
                                <Zap className="size-4" />
                                Loket Cepat
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={route('qc-shipments.index')}>
                                <Truck />
                                Kirim QC
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={route('pickups.create')}>
                                <HandPlatter />
                                Ambil barang
                            </Link>
                        </Button>
                    </>
                }
            >
                Admin mencatat setoran jahitan saat penjahit menyerahkan hasil jahit. Pilih "Setor semua" atau cicil "Sebagian" — upah penjahit langsung otomatis tercatat.
            </PageIntro>

            <div className="flex flex-col gap-5">
                <Section title="Sedang dijahit" icon={Users} description={`${board.length} penjahit memegang barang.`}>
                    {board.length > 3 && (
                        <div className="relative mb-4">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
                            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama penjahit atau artikel…" className="pl-10" />
                        </div>
                    )}
                    {rows.length === 0 ? (
                        <EmptyState className="text-base">
                            Tidak ada barang yang sedang dijahit.
                            <Button asChild variant="outline">
                                <Link href={route('pickups.create')}>
                                    <HandPlatter />
                                    Catat ambil barang
                                </Link>
                            </Button>
                        </EmptyState>
                    ) : (
                        <div className={holdingGridClass()}>
                            {rows.map((row) => (
                                <HoldingCard key={row.tailor.id} row={row} actions />
                            ))}
                        </div>
                    )}
                </Section>

                <Section title="Setoran terakhir" icon={History} description="Salah input? Batalkan selama belum dikirim ke QC dan belum masuk slip gaji.">
                    <DeliveryList deliveries={recentDeliveries} undoable />
                </Section>
            </div>
        </AppLayout>
    );
}
