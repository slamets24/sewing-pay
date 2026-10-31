import { ConfirmButton } from '@/components/confirm-button';
import { EmptyState } from '@/components/empty-state';
import { FormField, InputError } from '@/components/form-field';
import { FilterChips } from '@/components/sewing/master/filter-chips';
import { FormSheet } from '@/components/sewing/master/form-sheet';
import { MoneyField } from '@/components/sewing/master/money-field';
import { SearchBox } from '@/components/sewing/master/search-box';
import { PageIntro, Section } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArticleFilter, type ArticleFilterKey } from '@/domain/master/article-filter';
import { ArticleForm, type ArticleFormData } from '@/domain/master/article-form';
import { SheetState } from '@/domain/master/sheet-state';
import AppLayout from '@/layouts/app-layout';
import { formatDateTime, formatIdr, joinMeta } from '@/lib/format';
import type { Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { PriceBenchmarkSheet } from '@/components/sewing/master/price-benchmark-sheet';
import { floorActions } from '@/services/floor-actions';
import type { SharedData } from '@/types';
import type { ArticleRecord, TailorRecord } from '@/types/sewing';
import { useForm, usePage } from '@inertiajs/react';
import { Barcode, CloudDownload, Info, LoaderCircle, Pencil, Plus, Power, PowerOff, Save, Shirt, StickyNote, TriangleAlert } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

type ArticlesProps = {
    articles: ArticleRecord[];
    tailors: Array<Pick<TailorRecord, 'id' | 'name' | 'code' | 'type'>>;
    benchmarkHourlyRate: number;
    packingConfigured: boolean;
    lastSyncedAt: string | null;
};

const PAGE_SIZE = 40;

const SOURCE_TONE: Record<ArticleRecord['source'], Tone> = { packingv2: 'ready', manual: 'other' };

export default function Articles({ articles, tailors, benchmarkHourlyRate, packingConfigured, lastSyncedAt }: ArticlesProps) {
    const isOwner = usePage<SharedData>().props.auth.user?.role === 'superadmin';
    const [filter, setFilter] = useState(() => ArticleFilter.initial());
    const [limit, setLimit] = useState(PAGE_SIZE);
    const [sheet, setSheet] = useState(() => SheetState.closed<ArticleRecord>());
    const [benchmarkId, setBenchmarkId] = useState<number | null>(null);
    const benchmarkArticle = articles.find((article) => article.id === benchmarkId) ?? null;

    const options = useMemo(() => ArticleFilter.options(articles), [articles]);
    const visible = useMemo(() => filter.apply(articles), [filter, articles]);

    const changeFilter = (next: ArticleFilter) => {
        setFilter(next);
        setLimit(PAGE_SIZE);
    };

    const openFor = (article: ArticleRecord | null) => setSheet((current) => current.openFor(article));

    return (
        <AppLayout title="Artikel & tarif">
            <PageIntro
                actions={
                    <Button variant={isOwner ? 'outline' : 'default'} onClick={() => openFor(null)}>
                        <Plus />
                        Tambah artikel manual
                    </Button>
                }
            />

            <div className="flex flex-col gap-5">
                <PackingSyncPanel configured={packingConfigured} lastSyncedAt={lastSyncedAt} canSync={isOwner} />

                <Section title="Daftar artikel" icon={Shirt} description={`${articles.length} artikel tercatat`}>
                    <div className="mb-4 flex flex-col gap-3">
                        <SearchBox
                            value={filter.query}
                            onChange={(query) => changeFilter(filter.withQuery(query))}
                            placeholder="Cari nama, brand, kategori…"
                            label="Cari artikel"
                            className="md:max-w-md"
                        />
                        <FilterChips<ArticleFilterKey> label="Saring artikel" value={filter.key} options={options} onChange={(key) => changeFilter(filter.withKey(key))} />
                    </div>

                    {visible.length === 0 ? (
                        <EmptyState className="text-base">
                            {articles.length === 0 ? 'Belum ada artikel. Tarik dari packingv2 atau tambah artikel manual.' : 'Tidak ada artikel yang cocok dengan pilihan ini.'}
                        </EmptyState>
                    ) : (
                        <>
                            <ul className="grid gap-3 md:grid-cols-2">
                                {visible.slice(0, limit).map((article) => (
                                    <ArticleCard key={article.id} article={article} isOwner={isOwner} onEdit={() => openFor(article)} onBenchmark={() => setBenchmarkId(article.id)} />
                                ))}
                            </ul>
                            {visible.length > limit && (
                                <div className="mt-4 flex flex-col items-center gap-2">
                                    <p className="text-sm text-muted-foreground">
                                        Menampilkan {limit} dari {visible.length} artikel
                                    </p>
                                    <Button variant="outline" onClick={() => setLimit(limit + PAGE_SIZE)}>
                                        <Plus />
                                        Tampilkan {Math.min(PAGE_SIZE, visible.length - limit)} lagi
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </Section>
            </div>

            <ArticleSheet key={sheet.session} state={sheet} isOwner={isOwner} onOpenChange={(open) => setSheet((current) => current.withOpen(open))} />
            <PriceBenchmarkSheet
                key={benchmarkArticle?.id ?? 'none'}
                article={benchmarkArticle}
                tailors={tailors}
                hourlyRate={benchmarkHourlyRate}
                isOwner={isOwner}
                onOpenChange={(open) => {
                    if (!open) setBenchmarkId(null);
                }}
            />
        </AppLayout>
    );
}

function PackingSyncPanel({ configured, lastSyncedAt, canSync }: { configured: boolean; lastSyncedAt: string | null; canSync: boolean }) {
    const [syncing, setSyncing] = useState(false);

    const sync = () =>
        floorActions.send('post', route('articles.sync'), {}, { onStart: () => setSyncing(true), onFinish: () => setSyncing(false) });

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-t-4 border-t-stage-ready bg-card p-4 shadow-xs sm:flex-row sm:items-center">
            <span className="hidden size-10 shrink-0 items-center justify-center rounded-md bg-stage-ready text-white sm:flex" aria-hidden>
                <CloudDownload className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-base font-semibold">Artikel dari packingv2</p>
                <p className="text-sm text-muted-foreground">Terakhir ditarik: {lastSyncedAt ? formatDateTime(lastSyncedAt) : 'belum pernah'}</p>
                {canSync && !configured && (
                    <p className="mt-1 flex items-start gap-2 text-sm font-semibold text-foreground">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-stage-revision" aria-hidden />
                        Isi PACKINGV2_API_URL dan PACKINGV2_API_KEY di server dulu.
                    </p>
                )}
                {!canSync && <p className="text-sm text-muted-foreground">Hanya owner yang bisa menarik artikel baru.</p>}
            </div>
            {canSync && (
                <Button onClick={sync} disabled={!configured || syncing} className="w-full sm:w-auto">
                    {syncing ? <LoaderCircle className="animate-spin" /> : <CloudDownload />}
                    {syncing ? 'Menarik…' : 'Tarik dari packingv2'}
                </Button>
            )}
        </div>
    );
}

function ArticleCard({ article, isOwner, onEdit, onBenchmark }: { article: ArticleRecord; isOwner: boolean; onEdit: () => void; onBenchmark: () => void }) {
    const needsRate = ArticleFilter.needsRate(article);

    return (
        <li
            className={cn(
                'flex min-w-0 flex-col gap-3 rounded-lg border p-4',
                article.is_active ? 'bg-card' : 'border-dashed bg-muted/70',
                needsRate && 'border-l-4 border-l-stage-revision',
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className={cn('text-lg leading-tight font-bold wrap-anywhere', !article.is_active && 'text-muted-foreground')}>{article.display_name}</p>
                    <p className="text-sm text-muted-foreground">{joinMeta(article.brand_name, article.category_name) || 'Tanpa brand'}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <ToneBadge tone={SOURCE_TONE[article.source]}>{article.source_label}</ToneBadge>
                    {!article.is_active && <ToneBadge tone="neutral">Nonaktif</ToneBadge>}
                </div>
            </div>

            <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Barcode className="size-4 shrink-0" aria-hidden />
                {ArticleForm.variantSummary(article)}
            </p>

            <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-sm font-semibold text-muted-foreground">Tarif jahit per pcs</p>
                {article.sewing_rate > 0 ? (
                    <p className="font-display text-3xl leading-tight font-bold tabular">{formatIdr(article.sewing_rate)}</p>
                ) : (
                    <ToneBadge tone="revision" className="mt-1">
                        Tarif belum diisi
                    </ToneBadge>
                )}
                {isOwner && <RateEditor key={`${article.id}-${article.sewing_rate}`} article={article} />}
                <BenchmarkLine article={article} isOwner={isOwner} onOpen={onBenchmark} />
            </div>

            {article.notes && (
                <p className="flex items-start gap-2 text-base wrap-anywhere">
                    <StickyNote className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    {article.notes}
                </p>
            )}

            {isOwner && (
                <div className="mt-auto flex flex-wrap gap-2">
                    <Button variant="outline" onClick={onEdit} className="flex-1">
                        <Pencil />
                        {ArticleForm.canRename(article) ? 'Ubah nama & catatan' : 'Ubah catatan'}
                    </Button>
                    <ActiveToggle article={article} />
                </div>
            )}
        </li>
    );
}

function BenchmarkLine({ article, isOwner, onOpen }: { article: ArticleRecord; isOwner: boolean; onOpen: () => void }) {
    const benchmark = article.benchmark;

    if (!isOwner && !benchmark) {
        return null;
    }

    const ready = Boolean(benchmark?.ready && benchmark.suggested_rate != null);
    const matches = ready && article.sewing_rate === benchmark?.suggested_rate;

    return (
        <div className="mt-3 flex flex-col gap-2 border-t pt-3">
            <p className="text-sm text-muted-foreground">
                {ready
                    ? `Patokan sample ${formatIdr(benchmark?.suggested_rate ?? 0)}${matches ? ' · sama dengan tarif resmi' : ''}`
                    : benchmark
                      ? `Sample ${benchmark.color_count} dari ${benchmark.needed} warna`
                      : 'Belum ada sample waktu'}
            </p>
            <Button type="button" variant="outline" onClick={onOpen}>
                Lihat hitungan
            </Button>
        </div>
    );
}

/** Owner-only inline rate field. Keyed by the saved rate, so it re-reads the value whenever the server's rate changes. */
function RateEditor({ article }: { article: ArticleRecord }) {
    const form = useForm({ sewing_rate: article.sewing_rate });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(route('articles.update', article.id), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-1.5">
            <div className="flex gap-2">
                <MoneyField
                    id={`rate-${article.id}`}
                    value={form.data.sewing_rate}
                    onChange={(value) => form.setData('sewing_rate', value)}
                    invalid={!!form.errors.sewing_rate}
                    aria-label={`Tarif jahit ${article.display_name}`}
                    className="min-w-0 flex-1"
                />
                <Button type="submit" disabled={form.processing || !form.isDirty}>
                    {form.processing ? <LoaderCircle className="animate-spin" /> : <Save />}
                    Simpan
                </Button>
            </div>
            <InputError message={form.errors.sewing_rate} />
        </form>
    );
}

function ActiveToggle({ article }: { article: ArticleRecord }) {
    const [busy, setBusy] = useState(false);

    const setActive = (isActive: boolean) =>
        floorActions.send('patch', route('articles.update', article.id), { is_active: isActive }, { onStart: () => setBusy(true), onFinish: () => setBusy(false) });

    if (!article.is_active) {
        return (
            <Button variant="outline" disabled={busy} onClick={() => setActive(true)} className="flex-1">
                <Power />
                Aktifkan lagi
            </Button>
        );
    }

    return (
        <ConfirmButton disabled={busy} confirmLabel="Yakin? Tekan lagi" onConfirm={() => setActive(false)} className="flex-1">
            <PowerOff />
            Nonaktifkan
        </ConfirmButton>
    );
}

type ArticleSheetProps = {
    state: SheetState<ArticleRecord>;
    isOwner: boolean;
    onOpenChange: (open: boolean) => void;
};

/** Add a manual article (owner and admin), or let the owner fix the name and notes of one. */
function ArticleSheet({ state, isOwner, onOpenChange }: ArticleSheetProps) {
    const article = state.target;
    const canRename = article === null || ArticleForm.canRename(article);
    const form = useForm<ArticleFormData>(article ? ArticleForm.fromRecord(article) : ArticleForm.blank());
    form.transform((data) => (article ? ArticleForm.updatePayload(data, article) : ArticleForm.createPayload(data, isOwner)));

    const submit = () => {
        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (article) {
            form.patch(route('articles.update', article.id), options);
        } else {
            form.post(route('articles.store'), options);
        }
    };

    return (
        <FormSheet
            open={state.open}
            onOpenChange={onOpenChange}
            title={article ? 'Ubah artikel' : 'Tambah artikel manual'}
            description={article?.display_name}
            processing={form.processing}
            onSubmit={submit}
        >
            {canRename ? (
                <>
                    <FormField label="Nama artikel" htmlFor="article-name" error={form.errors.name}>
                        <Input
                            id="article-name"
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            aria-invalid={!!form.errors.name || undefined}
                            autoComplete="off"
                        />
                    </FormField>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="Brand" htmlFor="article-brand" error={form.errors.brand_name}>
                            <Input id="article-brand" value={form.data.brand_name} onChange={(event) => form.setData('brand_name', event.target.value)} autoComplete="off" />
                        </FormField>
                        <FormField label="Kategori" htmlFor="article-category" error={form.errors.category_name}>
                            <Input
                                id="article-category"
                                placeholder="Contoh: Gamis"
                                value={form.data.category_name}
                                onChange={(event) => form.setData('category_name', event.target.value)}
                                autoComplete="off"
                            />
                        </FormField>
                    </div>
                </>
            ) : (
                <Alert>
                    <Info />
                    <AlertTitle className="text-base">Nama dari packingv2</AlertTitle>
                    <AlertDescription className="text-sm">Nama, brand, dan kategori artikel ini diubah di packingv2, lalu tarik ulang.</AlertDescription>
                </Alert>
            )}

            {!article && isOwner && (
                <FormField label="Tarif jahit per pcs" htmlFor="article-rate" error={form.errors.sewing_rate}>
                    <MoneyField id="article-rate" value={form.data.sewing_rate} onChange={(value) => form.setData('sewing_rate', value)} invalid={!!form.errors.sewing_rate} />
                </FormField>
            )}

            <FormField label="Catatan" htmlFor="article-notes" error={form.errors.notes}>
                <Textarea id="article-notes" rows={3} className="text-base md:text-base" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
            </FormField>
        </FormSheet>
    );
}
