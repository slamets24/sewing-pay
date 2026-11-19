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
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                {/* Tab Switchers */}
                <div className="flex rounded-xl bg-muted/60 p-1 border border-border/60">
                    <button
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
                    </button>
                    <button
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
                    </button>
                    <button
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
                    </button>
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
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[10px]">
                                <th className="py-2.5 px-3 font-bold">No</th>
                                <th className="py-2.5 px-3 font-bold">Artikel</th>
                                <th className="py-2.5 px-3 font-bold">Brand / Kategori</th>
                                <th className="py-2.5 px-3 font-bold text-right">Total Pcs</th>
                                <th className="py-2.5 px-3 font-bold text-right">Kontribusi</th>
                                <th className="py-2.5 px-3 font-bold text-right">Total Upah</th>
                                <th className="py-2.5 px-3 font-bold text-right">Frekuensi Setor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredArticles.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                        Tidak ada artikel yang cocok.
                                    </td>
                                </tr>
                            ) : (
                                filteredArticles.map((a, idx) => (
                                    <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="py-3 px-3 font-mono text-muted-foreground">{idx + 1}</td>
                                        <td className="py-3 px-3 font-bold text-foreground text-sm">{a.name}</td>
                                        <td className="py-3 px-3 text-muted-foreground">{a.brand_name || '-'} {a.category_name ? `· ${a.category_name}` : ''}</td>
                                        <td className="py-3 px-3 text-right font-display font-black text-emerald-600 text-sm">
                                            {a.total_qty} pcs
                                        </td>
                                        <td className="py-3 px-3 text-right font-semibold text-muted-foreground">
                                            {a.percentage}%
                                        </td>
                                        <td className="py-3 px-3 text-right font-semibold text-foreground">
                                            {formatIdr(a.total_earnings)}
                                        </td>
                                        <td className="py-3 px-3 text-right text-muted-foreground font-mono">
                                            {a.deliveries_count}x
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB 2: REKAP PENJAHIT TABLE */}
            {activeTab === 'tailors' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[10px]">
                                <th className="py-2.5 px-3 font-bold">No</th>
                                <th className="py-2.5 px-3 font-bold">Nama Penjahit</th>
                                <th className="py-2.5 px-3 font-bold">Tipe</th>
                                <th className="py-2.5 px-3 font-bold text-right">Total Pcs</th>
                                <th className="py-2.5 px-3 font-bold text-right">Kontribusi</th>
                                <th className="py-2.5 px-3 font-bold text-right">Hari Aktif</th>
                                <th className="py-2.5 px-3 font-bold text-right">Rata-rata/Hari</th>
                                <th className="py-2.5 px-3 font-bold text-right">Total Upah</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredTailors.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                                        Tidak ada data penjahit yang cocok.
                                    </td>
                                </tr>
                            ) : (
                                filteredTailors.map((t, idx) => (
                                    <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="py-3 px-3 font-mono text-muted-foreground">{idx + 1}</td>
                                        <td className="py-3 px-3 font-bold text-foreground text-sm">
                                            {t.name}
                                            {t.code && <span className="ml-1 text-xs font-mono font-normal text-muted-foreground">({t.code})</span>}
                                        </td>
                                        <td className="py-3 px-3">
                                            <ToneBadge tone={t.type === 'makloon' ? 'other' : 'ready'}>
                                                {t.type === 'makloon' ? 'Makloon' : 'Borongan'}
                                            </ToneBadge>
                                        </td>
                                        <td className="py-3 px-3 text-right font-display font-black text-emerald-600 text-sm">
                                            {t.total_qty} pcs
                                        </td>
                                        <td className="py-3 px-3 text-right font-semibold text-muted-foreground">
                                            {t.percentage}%
                                        </td>
                                        <td className="py-3 px-3 text-right text-muted-foreground font-mono">
                                            {t.active_days} hari
                                        </td>
                                        <td className="py-3 px-3 text-right font-semibold text-foreground">
                                            {t.daily_avg} pcs
                                        </td>
                                        <td className="py-3 px-3 text-right font-bold text-foreground">
                                            {formatIdr(t.total_earnings)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB 3: LOG RIWAYAT SETORAN TABLE */}
            {activeTab === 'logs' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-border/60 text-muted-foreground uppercase tracking-wider text-[10px]">
                                <th className="py-2.5 px-3 font-bold">Waktu</th>
                                <th className="py-2.5 px-3 font-bold">Penjahit</th>
                                <th className="py-2.5 px-3 font-bold">Artikel & Varian</th>
                                <th className="py-2.5 px-3 font-bold">WO</th>
                                <th className="py-2.5 px-3 font-bold text-right">Qty</th>
                                <th className="py-2.5 px-3 font-bold text-right">Tarif</th>
                                <th className="py-2.5 px-3 font-bold text-right">Subtotal</th>
                                <th className="py-2.5 px-3 font-bold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                                        Tidak ada catatan setoran yang cocok.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((l) => (
                                    <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{l.delivered_at}</td>
                                        <td className="py-3 px-3 font-bold text-foreground">{l.tailor_name}</td>
                                        <td className="py-3 px-3">
                                            <span className="font-bold text-foreground">{l.article_name}</span>
                                            {(l.color || l.size) && (
                                                <span className="text-muted-foreground ml-1">({variantLabel(l.color, l.size)})</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 font-mono text-muted-foreground">{l.work_order_number}</td>
                                        <td className="py-3 px-3 text-right font-display font-black text-emerald-600 text-sm">
                                            +{l.qty} pcs
                                        </td>
                                        <td className="py-3 px-3 text-right text-muted-foreground font-mono">
                                            {formatIdr(l.sewing_rate)}
                                        </td>
                                        <td className="py-3 px-3 text-right font-semibold text-foreground">
                                            {formatIdr(l.subtotal)}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {l.qc_shipment_number ? (
                                                <ToneBadge tone="shipped">QC {l.qc_shipment_number}</ToneBadge>
                                            ) : (
                                                <ToneBadge tone="neutral">Di Loket</ToneBadge>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
