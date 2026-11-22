import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatIdr, variantLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
    BarChart3,
    Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DeliveryLog, TopArticle, TopTailor } from './types';

type DetailTablesProps = { topArticles: TopArticle[]; topTailors: TopTailor[]; deliveryLogs: DeliveryLog[] };

/** Full tables (per article, per tailor, every setoran). Folded by default; most days the summary above is enough. */
export function DetailTables({ topArticles, topTailors, deliveryLogs }: DetailTablesProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'articles' | 'tailors' | 'logs'>('articles');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredArticles = useMemo(() => {
        if (!searchQuery) return topArticles;
        const q = searchQuery.toLowerCase();
        return topArticles.filter((a) => a.name.toLowerCase().includes(q) || (a.brand_name && a.brand_name.toLowerCase().includes(q)));
    }, [topArticles, searchQuery]);

    const filteredTailors = useMemo(() => {
        if (!searchQuery) return topTailors;
        const q = searchQuery.toLowerCase();
        return topTailors.filter((t) => t.name.toLowerCase().includes(q) || (t.code && t.code.toLowerCase().includes(q)));
    }, [topTailors, searchQuery]);

    const filteredLogs = useMemo(() => {
        if (!searchQuery) return deliveryLogs;
        const q = searchQuery.toLowerCase();
        return deliveryLogs.filter(
            (l) => l.tailor_name.toLowerCase().includes(q) || l.article_name.toLowerCase().includes(q) || l.work_order_number.toLowerCase().includes(q),
        );
    }, [deliveryLogs, searchQuery]);

    if (!open) {
        return (
            <Button variant="outline" className="h-auto min-h-12 w-full rounded-2xl py-2.5 whitespace-normal" onClick={() => setOpen(true)}>
                <BarChart3 />
                <span className="min-w-0 text-left">Tampilkan tabel rinci ({deliveryLogs.length} setoran)</span>
            </Button>
        );
    }

    return (
        <Card asChild>
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                    {/* Tab Switchers */}
                    <div className="flex rounded-xl bg-muted/60 p-1 border border-border/60">
                        <Button variant="plain" size="plain"
                            type="button"
                            onClick={() => setActiveTab('articles')}
                            className={cn(
                                'rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                                activeTab === 'articles'
                                    ? 'bg-card text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Rekap Per Artikel ({topArticles.length})
                        </Button>
                        <Button variant="plain" size="plain"
                            type="button"
                            onClick={() => setActiveTab('tailors')}
                            className={cn(
                                'rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                                activeTab === 'tailors'
                                    ? 'bg-card text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Rekap Per Penjahit ({topTailors.length})
                        </Button>
                        <Button variant="plain" size="plain"
                            type="button"
                            onClick={() => setActiveTab('logs')}
                            className={cn(
                                'rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                                activeTab === 'logs'
                                    ? 'bg-card text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Log Riwayat Setoran ({deliveryLogs.length})
                        </Button>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama artikel / penjahit..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-8 text-xs rounded-xl"
                        />
                    </div>
                </div>

                {/* TAB 1: REKAP ARTIKEL TABLE */}
                {activeTab === 'articles' && (
                    <div className="overflow-x-auto">
                        <Table scrollContainer={false} className="w-full text-left text-xs">
                            <TableHeader>
                                <TableRow className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[10px]">
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold">No</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold">Artikel</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold">Brand / Kategori</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-right">Total Pcs</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-right">Kontribusi</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-right">Total Upah</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-right">Frekuensi Setor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border/50">
                                {filteredArticles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="whitespace-normal py-8 text-center text-muted-foreground">
                                            Tidak ada artikel yang cocok.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredArticles.map((a, idx) => (
                                        <TableRow key={a.id} className="hover:bg-muted/20 transition-colors">
                                            <TableCell className="whitespace-normal py-3 px-3 font-mono text-muted-foreground">{idx + 1}</TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 font-bold text-foreground text-sm">{a.name}</TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-muted-foreground">{a.brand_name || '-'} {a.category_name ? `· ${a.category_name}` : ''}</TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-right font-display font-black text-emerald-600 text-sm">
                                                {a.total_qty} pcs
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-right font-semibold text-muted-foreground">
                                                {a.percentage}%
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-right font-semibold text-foreground">
                                                {formatIdr(a.total_earnings)}
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-right text-muted-foreground font-mono">
                                                {a.deliveries_count}x
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* TAB 2: REKAP PENJAHIT TABLE */}
                {activeTab === 'tailors' && (
                    <div className="overflow-x-auto">
                        <Table scrollContainer={false} className="w-full text-left text-xs">
                            <TableHeader>
                                <TableRow className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[10px]">
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold">No</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold">Nama Penjahit</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold">Tipe</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-right">Total Pcs</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-right">Kontribusi</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-right">Hari Aktif</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-right">Rata-rata/Hari</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-right">Total Upah</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border/50">
                                {filteredTailors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="whitespace-normal py-8 text-center text-muted-foreground">
                                            Tidak ada data penjahit yang cocok.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTailors.map((t, idx) => (
                                        <TableRow key={t.id} className="hover:bg-muted/20 transition-colors">
                                            <TableCell className="whitespace-normal py-3 px-3 font-mono text-muted-foreground">{idx + 1}</TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 font-bold text-foreground text-sm">
                                                {t.name}
                                                {t.code && <span className="ml-1 text-xs font-mono font-normal text-muted-foreground">({t.code})</span>}
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3">
                                                <ToneBadge tone={t.type === 'makloon' ? 'other' : 'ready'}>
                                                    {t.type === 'makloon' ? 'Makloon' : 'Borongan'}
                                                </ToneBadge>
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-right font-display font-black text-emerald-600 text-sm">
                                                {t.total_qty} pcs
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-right font-semibold text-muted-foreground">
                                                {t.percentage}%
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-right text-muted-foreground font-mono">
                                                {t.active_days} hari
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-right font-semibold text-foreground">
                                                {t.daily_avg} pcs
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-right font-bold text-foreground">
                                                {formatIdr(t.total_earnings)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* TAB 3: LOG RIWAYAT SETORAN TABLE */}
                {activeTab === 'logs' && (
                    <div className="overflow-x-auto">
                        <Table scrollContainer={false} className="w-full text-left text-xs">
                            <TableHeader>
                                <TableRow className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[10px]">
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold">Waktu</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold">Penjahit</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold">Artikel & Varian</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold">WO</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-right">Qty</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-right">Tarif</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-right">Subtotal</TableHead>
                                    <TableHead className="h-auto whitespace-normal py-2.5 px-3 font-bold text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border/50">
                                {filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="whitespace-normal py-8 text-center text-muted-foreground">
                                            Tidak ada catatan setoran yang cocok.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((l) => (
                                        <TableRow key={l.id} className="hover:bg-muted/20 transition-colors">
                                            <TableCell className="py-3 px-3 text-muted-foreground whitespace-nowrap">{l.delivered_at}</TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 font-bold text-foreground">{l.tailor_name}</TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3">
                                                <span className="font-bold text-foreground">{l.article_name}</span>
                                                {(l.color || l.size) && (
                                                    <span className="text-muted-foreground ml-1">({variantLabel(l.color, l.size)})</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 font-mono text-muted-foreground">{l.work_order_number}</TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-right font-display font-black text-emerald-600 text-sm">
                                                +{l.qty} pcs
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-right text-muted-foreground font-mono">
                                                {formatIdr(l.sewing_rate)}
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-right font-semibold text-foreground">
                                                {formatIdr(l.subtotal)}
                                            </TableCell>
                                            <TableCell className="whitespace-normal py-3 px-3 text-center">
                                                {l.qc_shipment_number ? (
                                                    <ToneBadge tone="shipped">QC {l.qc_shipment_number}</ToneBadge>
                                                ) : (
                                                    <ToneBadge tone="neutral">Di Loket</ToneBadge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </Card>
    );
}
