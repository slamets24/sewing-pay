import { AppLogo } from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { formatDate, joinMeta, variantLabel } from '@/lib/format';
import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import type { ReactNode } from 'react';

type PublicArticle = {
    name: string;
    brand_name: string | null;
    qty: number;
    done_qty: number;
    variants: { color: string | null; size: string | null; qty: number }[];
};

type PublicWorkOrderProps = {
    workOrder: {
        number: string;
        channel: string | null;
        category: string | null;
        ordered_at: string | null;
        due_at: string | null;
        notes: string | null;
        planned_qty: number;
        done_qty: number;
        articles: PublicArticle[];
    };
};

/** WO yang dibuka dari grup WhatsApp: tanpa login, enak dibaca di HP, rapi saat dicetak / disimpan PDF. */
export default function PublicWorkOrder({ workOrder }: PublicWorkOrderProps) {
    const pct = workOrder.planned_qty > 0 ? Math.min(100, Math.round((workOrder.done_qty / workOrder.planned_qty) * 100)) : 0;

    return (
        <div className="min-h-screen bg-background px-3 py-4 [-webkit-print-color-adjust:exact] [print-color-adjust:exact] sm:px-6 sm:py-8 print:bg-white print:p-0">
            <Head title={`WO ${workOrder.number}`} />

            <article className="surface-card mx-auto max-w-3xl overflow-hidden print:max-w-none print:rounded-none print:border-0 print:shadow-none">
                <header className="border-b px-4 py-5 sm:px-6">
                    <AppLogo subtitle="Divisi jahit" />
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Work order</p>
                            <h1 className="text-3xl font-bold tracking-tight break-all sm:text-4xl">{workOrder.number}</h1>
                        </div>
                        <div className="text-right">
                            <p className="font-display text-3xl leading-none font-bold tabular">{workOrder.planned_qty.toLocaleString('id-ID')}</p>
                            <p className="text-sm text-muted-foreground">pcs total</p>
                        </div>
                    </div>
                    <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
                        {(workOrder.channel || workOrder.category) && <Item label="Order">{joinMeta(workOrder.channel, workOrder.category)}</Item>}
                        <Item label="Tanggal">{formatDate(workOrder.ordered_at)}</Item>
                        <Item label="Deadline">{formatDate(workOrder.due_at)}</Item>
                    </dl>
                    <div className="mt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Sudah selesai dijahit</span>
                            <span className="font-semibold tabular">
                                {workOrder.done_qty} / {workOrder.planned_qty} pcs · {pct}%
                            </span>
                        </div>
                        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full rounded-full bg-stage-done" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                </header>

                <div className="flex flex-col gap-3 px-4 py-5 sm:px-6">
                    <h2 className="text-xl font-bold uppercase">Artikel</h2>
                    <ul className="flex flex-col gap-3">
                        {workOrder.articles.map((article) => (
                            <li key={article.name} className="rounded-lg border px-4 py-3 break-inside-avoid">
                                <div className="flex items-baseline justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-lg font-bold">{article.name}</p>
                                        {article.brand_name && <p className="text-sm text-muted-foreground">{article.brand_name}</p>}
                                    </div>
                                    <p className="shrink-0 font-display text-2xl font-bold tabular">
                                        {article.qty}
                                        <span className="ml-1 text-sm font-medium text-muted-foreground">pcs</span>
                                    </p>
                                </div>
                                <ul className="mt-2 flex flex-wrap gap-1.5">
                                    {article.variants.map((variant, index) => (
                                        <li key={index} className="rounded-md bg-muted/60 px-2 py-1 text-sm">
                                            {variantLabel(variant.color, variant.size) || 'Tanpa varian'} · <span className="font-semibold tabular">{variant.qty}</span>
                                        </li>
                                    ))}
                                </ul>
                                {article.done_qty > 0 && <p className="mt-2 text-xs text-muted-foreground">Selesai dijahit {article.done_qty} pcs</p>}
                            </li>
                        ))}
                    </ul>

                    {workOrder.notes && (
                        <section className="rounded-lg border bg-muted/50 px-4 py-3">
                            <h2 className="text-base font-bold uppercase">Catatan</h2>
                            <p className="text-sm whitespace-pre-line">{workOrder.notes}</p>
                        </section>
                    )}

                    <footer className="mt-2 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">Data diambil langsung dari OPSEW saat halaman ini dibuka.</p>
                        <Button type="button" size="lg" className="print:hidden" onClick={() => window.print()}>
                            <Printer />
                            Cetak / simpan PDF
                        </Button>
                    </footer>
                </div>
            </article>
        </div>
    );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</dt>
            <dd className="text-base font-medium">{children}</dd>
        </div>
    );
}
