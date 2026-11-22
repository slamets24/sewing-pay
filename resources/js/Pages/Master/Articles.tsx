import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { useCan } from '@/lib/abilities';
import { floorActions } from '@/services/floor-actions';
import type { ArticleRecord, TailorRecord } from '@/types/sewing';
import { useForm } from '@inertiajs/react';
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
    const can = useCan();
    // Each part of the page follows its own ability (Master Data › Role & Akses).
    const canEdit = can('articles.update');
    const canCreate = can('articles.create');
    const canSync = can('articles.sync');
    const canSamples = can('articles.samples');
    const [filter, setFilter] = useState(() => ArticleFilter.initial());
    const [limit, setLimit] = useState(PAGE_SIZE);
    const [sheet, setSheet] = useState(() => SheetState.closed<ArticleRecord>());
    const [benchmarkId, setBenchmarkId] = useState<number | null>(null);
    const benchmarkArticle = articles.find((article) => article.id === benchmarkId) ?? null;

    const options = useMemo(() => ArticleFilter.options(articles), [articles]);
    const visible = useMemo(() => filter.apply(articles), [filter, articles]);
    const missingRateCount = useMemo(() => articles.filter((article) => article.is_active && ArticleFilter.needsRate(article)).length, [articles]);

    const changeFilter = (next: ArticleFilter) => {
        setFilter(next);
        setLimit(PAGE_SIZE);
    };

    const openFor = (article: ArticleRecord | null) => setSheet((current) => current.openFor(article));

    return (
        <AppLayout title="Artikel & tarif">
            <PageIntro
                actions={
                    canCreate && (
                        <Button variant={canEdit ? 'outline' : 'default'} onClick={() => openFor(null)}>
                            <Plus />
                            Tambah artikel manual
                        </Button>
                    )
                }
            />

            <div className="flex flex-col gap-5">
                <PackingSyncPanel configured={packingConfigured} lastSyncedAt={lastSyncedAt} canSync={canSync} />

                {missingRateCount > 0 && filter.key !== 'no_rate' && (
                    <Alert className="border-stage-revision/40 bg-stage-revision/8">
                        <TriangleAlert className="text-stage-revision" />
                        <AlertTitle>{missingRateCount} artikel aktif belum punya tarif</AlertTitle>
                        <AlertDescription className="flex flex-wrap items-center gap-3">
                            <span>Setoran artikel ini dihitung Rp0 sampai tarifnya diisi. Begitu diisi, pekerjaan yang belum dibayar ikut tarif baru.</span>
                            <Button size="sm" variant="outline" onClick={() => changeFilter(filter.withKey('no_rate'))}>
                                Tampilkan
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

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
                                    <ArticleCard key={article.id} article={article} canEdit={canEdit} canSync={canSync} canSamples={canSamples} packingConfigured={packingConfigured} onEdit={() => openFor(article)} onBenchmark={() => setBenchmarkId(article.id)} />
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

            <ArticleSheet key={sheet.session} state={sheet} canEdit={canEdit} onOpenChange={(open) => setSheet((current) => current.withOpen(open))} />
            <PriceBenchmarkSheet
                key={benchmarkArticle?.id ?? 'none'}
                article={benchmarkArticle}
                tailors={tailors}
                hourlyRate={benchmarkHourlyRate}
                canAdoptRate={canEdit}
                canManageSamples={canSamples}
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
        <Card asChild>
            <div className="flex flex-col gap-3 border border-t-4 border-t-stage-ready bg-card p-4 sm:flex-row sm:items-center">
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
                    {!canSync && <p className="text-sm text-muted-foreground">Role Anda tidak punya akses menarik artikel baru.</p>}
                </div>
                {canSync && (
                    <Button onClick={sync} disabled={!configured || syncing} className="w-full sm:w-auto">
                        {syncing ? <LoaderCircle className="animate-spin" /> : <CloudDownload />}
                        {syncing ? 'Menarik…' : 'Tarik dari packingv2'}
                    </Button>
                )}
            </div>
        </Card>
    );
}

/** canEdit = may edit the article and its rates (ability articles.update). */
type ArticleCardProps = { article: ArticleRecord; canEdit: boolean; canSync: boolean; canSamples: boolean; packingConfigured: boolean; onEdit: () => void; onBenchmark: () => void };

function ArticleCard({ article, canEdit, canSync, canSamples, packingConfigured, onEdit, onBenchmark }: ArticleCardProps) {
    const needsRate = ArticleFilter.needsRate(article);
    // Variants without an official packingv2 barcode can be requested from packingv2 (owner only).
    const canProvision = canSync && packingConfigured && article.variants_count > 0 && article.barcode_count < article.variants_count;

    return (
        <Card asChild>
            <li
                className={cn(
                    'flex min-w-0 flex-col gap-3 border p-4',
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
                        {article.fabric_type && <ToneBadge tone="neutral">{article.fabric_type === 'polos' ? 'Polos' : 'Print'}</ToneBadge>}
                        {(article.processes?.length ?? 0) > 0 && <ToneBadge tone="neutral">{article.processes!.join(' → ')}</ToneBadge>}
                        {!article.is_active && <ToneBadge tone="neutral">Nonaktif</ToneBadge>}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Barcode className="size-4 shrink-0" aria-hidden />
                    {ArticleForm.variantSummary(article)}
                    {canProvision && <ProvisionBarcodeButton article={article} />}
                </div>

                {canEdit ? (
                    <RateEditor key={`${article.id}-${article.sewing_rate}-${article.makloon_sewing_rate}`} article={article} />
                ) : (
                    <RateSummary article={article} />
                )}
                <BenchmarkLine article={article} canEdit={canEdit || canSamples} onOpen={onBenchmark} />

                {article.notes && (
                    <p className="flex items-start gap-2 text-base wrap-anywhere">
                        <StickyNote className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        {article.notes}
                    </p>
                )}

                {canEdit && (
                    <div className="mt-auto flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
                            <Pencil />
                            {ArticleForm.canRename(article) ? 'Ubah nama & catatan' : 'Ubah catatan'}
                        </Button>
                        <ActiveToggle article={article} />
                    </div>
                )}
            </li>
        </Card>
    );
}

function BenchmarkLine({ article, canEdit, onOpen }: { article: ArticleRecord; canEdit: boolean; onOpen: () => void }) {
    const benchmark = article.benchmark;

    if (!canEdit && !benchmark) {
        return null;
    }

    const ready = Boolean(benchmark?.ready && benchmark.suggested_rate != null);
    const matches = ready && article.sewing_rate === benchmark?.suggested_rate;

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
                {ready
                    ? `Patokan sample ${formatIdr(benchmark?.suggested_rate ?? 0)}${matches ? ' · sama dengan tarif' : ''}`
                    : benchmark
                      ? `Sample ${benchmark.color_count} dari ${benchmark.needed} warna`
                      : 'Belum ada sample waktu'}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={onOpen} className="h-8">
                Lihat hitungan
            </Button>
        </div>
    );
}

/** Read-only rates for admins. */
function RateSummary({ article }: { article: ArticleRecord }) {
    if (article.sewing_rate <= 0) {
        return <ToneBadge tone="revision" className="self-start">Tarif belum diisi</ToneBadge>;
    }

    return (
        <p className="text-sm text-muted-foreground">
            Internal <span className="font-display text-lg font-bold text-foreground tabular">{formatIdr(article.sewing_rate)}</span>
            {' · '}Maklun <span className="font-display text-lg font-bold text-foreground tabular">{formatIdr(article.makloon_sewing_rate || article.sewing_rate)}</span>
        </p>
    );
}

function ProvisionBarcodeButton({ article }: { article: ArticleRecord }) {
    const [busy, setBusy] = useState(false);

    return (
        <ConfirmButton
            size="sm"
            variant="ghost"
            className="h-8"
            disabled={busy}
            confirmLabel={`Ya, minta ${article.variants_count - article.barcode_count} barcode`}
            onConfirm={() =>
                floorActions.send('post', route('articles.provision-packing', article.id), {}, { onStart: () => setBusy(true), onFinish: () => setBusy(false) })
            }
        >
            {busy ? <LoaderCircle className="animate-spin" /> : <CloudDownload />}
            Minta barcode packing
        </ConfirmButton>
    );
}

/** Owner-only inline rate field. Keyed by the saved rate, so it re-reads the value whenever the server's rate changes. */
function RateEditor({ article }: { article: ArticleRecord }) {
    const form = useForm({
        sewing_rate: article.sewing_rate,
        // 0 = same as the internal rate (follows it when the internal rate changes later).
        makloon_sewing_rate: article.makloon_sewing_rate ?? 0,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(route('articles.update', article.id), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-1.5">
            <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <div>
                    <Label htmlFor={`rate-${article.id}`} className="mb-1 block text-xs font-semibold text-muted-foreground">
                        Tarif internal
                    </Label>
                    <MoneyField
                        id={`rate-${article.id}`}
                        value={form.data.sewing_rate}
                        onChange={(value) => form.setData('sewing_rate', value)}
                        invalid={!!form.errors.sewing_rate || article.sewing_rate <= 0}
                        aria-label={`Tarif internal ${article.display_name}`}
                        className="w-full"
                    />
                </div>
                <div>
                    <Label htmlFor={`makloon-rate-${article.id}`} className="mb-1 block text-xs font-semibold text-muted-foreground">
                        Maklun <span className="font-normal">(0 = sama)</span>
                    </Label>
                    <MoneyField
                        id={`makloon-rate-${article.id}`}
                        value={form.data.makloon_sewing_rate}
                        onChange={(value) => form.setData('makloon_sewing_rate', value)}
                        invalid={!!form.errors.makloon_sewing_rate}
                        aria-label={`Tarif maklun ${article.display_name}`}
                        className="w-full"
                    />
                </div>
                <Button type="submit" disabled={form.processing || !form.isDirty} aria-label="Simpan tarif" title="Simpan tarif">
                    {form.processing ? <LoaderCircle className="animate-spin" /> : <Save />}
                    <span className="hidden sm:inline">Simpan</span>
                </Button>
            </div>
            {article.sewing_rate <= 0 && !form.isDirty && <p className="text-xs font-semibold text-stage-revision">Tarif belum diisi, setoran artikel ini dihitung Rp0.</p>}
            {form.errors.sewing_rate && <InputError message={form.errors.sewing_rate} />}
            {form.errors.makloon_sewing_rate && <InputError message={form.errors.makloon_sewing_rate} />}
        </form>
    );
}

function ActiveToggle({ article }: { article: ArticleRecord }) {
    const [busy, setBusy] = useState(false);

    const setActive = (isActive: boolean) =>
        floorActions.send('patch', route('articles.update', article.id), { is_active: isActive }, { onStart: () => setBusy(true), onFinish: () => setBusy(false) });

    if (!article.is_active) {
        return (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setActive(true)} className="flex-1">
                <Power />
                Aktifkan lagi
            </Button>
        );
    }

    return (
        <ConfirmButton size="sm" disabled={busy} confirmLabel="Yakin? Tekan lagi" onConfirm={() => setActive(false)} className="flex-1">
            <PowerOff />
            Nonaktifkan
        </ConfirmButton>
    );
}

type ArticleSheetProps = {
    state: SheetState<ArticleRecord>;
    canEdit: boolean;
    onOpenChange: (open: boolean) => void;
};

/** Add a manual article (owner and admin), or let the owner fix the name and notes of one. */
function ArticleSheet({ state, canEdit, onOpenChange }: ArticleSheetProps) {
    const article = state.target;
    const canRename = article === null || ArticleForm.canRename(article);
    const form = useForm<ArticleFormData>(article ? ArticleForm.fromRecord(article) : ArticleForm.blank());
    form.transform((data) => (article ? ArticleForm.updatePayload(data, article) : ArticleForm.createPayload(data, canEdit)));

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

            {!article && canEdit && (
                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Tarif Jahit Internal" htmlFor="article-rate" error={form.errors.sewing_rate}>
                        <MoneyField id="article-rate" value={form.data.sewing_rate} onChange={(value) => form.setData('sewing_rate', value)} invalid={!!form.errors.sewing_rate} />
                    </FormField>
                    <FormField label="Tarif Jahit Maklun" htmlFor="article-makloon-rate" error={form.errors.makloon_sewing_rate}>
                        <MoneyField id="article-makloon-rate" value={form.data.makloon_sewing_rate ?? 0} onChange={(value) => form.setData('makloon_sewing_rate', value)} invalid={!!form.errors.makloon_sewing_rate} />
                    </FormField>
                </div>
            )}

            <FormField label="Catatan" htmlFor="article-notes" error={form.errors.notes}>
                <Textarea id="article-notes" rows={3} className="text-base md:text-base" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
            </FormField>
        </FormSheet>
    );
}
