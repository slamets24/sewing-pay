import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatIdr, joinMeta } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PickupDraft, type PickupStep } from '@/models/pickup-draft';
import type { TailorBoard } from '@/models/tailor-board';
import { operationalService } from '@/services/operational-service';
import type { Article, Tailor } from '@/types';
import { Check, Scissors } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QtyStepper } from './qty-stepper';

type PickupWizardProps = {
    tailors: Tailor[];
    articles: Article[];
    idPrefix: string;
    /** Workload hints shown under each tailor's name. */
    board?: TailorBoard;
    /** Pre-selects a tailor; pass a new object per request so repeated picks re-apply. */
    preset?: { tailorId: number };
    /** Keeps the save button above the mobile bottom navigation while scrolling. */
    stickyFooter?: boolean;
    /** Shown when there is nothing to pick up. */
    emptyAction?: ReactNode;
};

const SEARCH_THRESHOLD = 5;

const hints: Record<PickupStep, string> = {
    tailor: 'Pilih penjahit dulu',
    article: 'Pilih hancaan yang diambil',
    qty: 'Isi qty yang diambil',
};

/** "Who → what → how many" pickup flow; each answered step collapses into a one-line summary. */
export function PickupWizard({ tailors, articles, idPrefix, board, preset, stickyFooter = false, emptyAction }: PickupWizardProps) {
    const [draft, setDraft] = useState(() => PickupDraft.start());
    const [search, setSearch] = useState('');
    const [showNotes, setShowNotes] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (preset) setDraft(PickupDraft.start(preset.tailorId));
    }, [preset]);

    useEffect(() => {
        setDraft((current) => current.syncWith(articles));
    }, [articles]);

    const tailor = tailors.find((item) => item.id === draft.tailorId);
    const query = search.trim().toLowerCase();
    const visibleArticles = useMemo(
        () =>
            query
                ? articles.filter((article) => [article.article_name, article.color, article.size, article.work_type_name].join(' ').toLowerCase().includes(query))
                : articles,
        [articles, query],
    );

    const reset = () => {
        setDraft(PickupDraft.start());
        setSearch('');
        setShowNotes(false);
    };

    const submit = () =>
        operationalService.pickUp(draft, {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: reset,
        });

    if (!articles.length) {
        return (
            <EmptyState>
                Belum ada hancaan siap ambil.
                {emptyAction}
            </EmptyState>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <WizardStep
                number={1}
                title="1. Penjahit"
                state={draft.step === 'tailor' ? 'active' : 'done'}
                summary={tailor?.name}
                onEdit={() => setDraft(draft.withTailor(null))}
            >
                <div className="grid grid-cols-2 gap-2">
                    {tailors.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="flex min-w-0 flex-col items-start gap-0.5 rounded-lg border bg-background p-3 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            onClick={() => setDraft(draft.withTailor(item.id))}
                        >
                            <span className="w-full truncate text-sm font-medium">{item.name}</span>
                            <span className="w-full truncate text-xs text-muted-foreground">{board?.workloadOf(item.id)?.summary ?? item.code}</span>
                        </button>
                    ))}
                </div>
            </WizardStep>

            <WizardStep
                number={2}
                title="2. Hancaan"
                state={draft.step === 'tailor' ? 'locked' : draft.step === 'article' ? 'active' : 'done'}
                summary={draft.article ? `${draft.article.article_name} · ${joinMeta(draft.article.color, draft.article.size)}` : undefined}
                onEdit={() => setDraft(draft.withArticle(null))}
            >
                <div className="flex flex-col gap-2">
                    {articles.length > SEARCH_THRESHOLD && (
                        <Input
                            aria-label="Cari hancaan"
                            placeholder="Cari artikel, warna, atau size"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    )}
                    {visibleArticles.map((article) => (
                        <button
                            key={article.id}
                            type="button"
                            className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            onClick={() => setDraft(draft.withArticle(article))}
                        >
                            <span className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate text-sm font-medium">{article.article_name}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {joinMeta(article.color, article.size)} · {formatIdr(article.rate_amount)}/pcs
                                </span>
                            </span>
                            <Badge variant="secondary" className="shrink-0">
                                {article.available_qty} tersedia
                            </Badge>
                        </button>
                    ))}
                    {!visibleArticles.length && <p className="py-2 text-center text-sm text-muted-foreground">Tidak ada hancaan yang cocok.</p>}
                </div>
            </WizardStep>

            <WizardStep number={3} title="3. Jumlah" state={draft.step === 'qty' ? 'active' : 'locked'}>
                <div className="flex flex-col gap-3">
                    <QtyStepper id={`${idPrefix}-qty`} value={draft.qty} max={draft.maxQty} presets={[5, 10, 20]} onChange={(qty) => setDraft(draft.withQty(qty))} />
                    {showNotes ? (
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`${idPrefix}-notes`}>Catatan</Label>
                            <Textarea
                                id={`${idPrefix}-notes`}
                                rows={2}
                                placeholder="Catatan"
                                value={draft.notes}
                                onChange={(event) => setDraft(draft.withNotes(event.target.value))}
                            />
                        </div>
                    ) : (
                        <Button type="button" variant="link" className="h-auto self-start p-0" onClick={() => setShowNotes(true)}>
                            Tambah catatan
                        </Button>
                    )}
                </div>
            </WizardStep>

            <div
                className={cn(
                    stickyFooter && 'sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur',
                )}
            >
                <Button size="lg" className="h-auto w-full py-3 whitespace-normal" disabled={!draft.isComplete || processing} onClick={submit}>
                    <Scissors />
                    {draft.isComplete ? `${tailor?.name} ambil ${draft.qty} pcs · ≈ ${formatIdr(draft.estimatedWage)}` : hints[draft.step]}
                </Button>
            </div>
        </div>
    );
}

type WizardStepProps = {
    number: number;
    title: string;
    state: 'active' | 'done' | 'locked';
    summary?: string;
    onEdit?: () => void;
    children: ReactNode;
};

function WizardStep({ number, title, state, summary, onEdit, children }: WizardStepProps) {
    return (
        <section className={cn('rounded-xl border bg-card', state === 'locked' && 'opacity-60')} aria-current={state === 'active' ? 'step' : undefined}>
            <header className="flex items-center gap-3 px-3 py-2.5">
                <span
                    className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        state === 'done' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        state === 'active' && 'bg-foreground text-background',
                    )}
                >
                    {state === 'done' ? <Check className="size-3.5" /> : number}
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className={cn('text-sm', state === 'done' ? 'text-muted-foreground' : 'font-semibold')}>{title}</h3>
                    {state === 'done' && summary && <p className="truncate text-sm font-medium">{summary}</p>}
                </div>
                {state === 'done' && onEdit && (
                    <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
                        Ganti
                    </Button>
                )}
            </header>
            {state === 'active' && <div className="border-t p-3">{children}</div>}
        </section>
    );
}
