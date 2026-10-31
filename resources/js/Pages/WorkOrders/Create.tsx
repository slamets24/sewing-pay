import { ArticlePicker } from '@/components/sewing/work-order/article-picker';
import { WorkOrderHeaderFields } from '@/components/sewing/work-order/header-fields';
import { PageIntro, Section } from '@/components/sewing/section';
import { QtyStepper } from '@/components/sewing/qty-stepper';
import { StickyBar } from '@/components/sewing/sticky-bar';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArticleMatcher } from '@/domain/work-order/article-matcher';
import { WorkOrderDraft, type DraftGroup } from '@/domain/work-order/work-order-draft';
import { WorkOrderTextParser } from '@/domain/work-order/work-order-text-parser';
import AppLayout from '@/layouts/app-layout';
import type { ArticleAliasRecord, CatalogArticle } from '@/types/sewing';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, ClipboardList, MessageSquareText, Plus, Save, Shirt, Trash2, TriangleAlert, WandSparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type CreateProps = {
    articles: CatalogArticle[];
    aliases: ArticleAliasRecord[];
};

const SAMPLE = `LOKA 324
ORDERAN RESELLER & TOKO ONLINE
01 OKTOBER 2026

PRINT
MARINA ONE SET (17)
Teal blue S1 m1 l1 xl1
Brown S1 m1 l1 xl1 xxl1`;

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'ALLSIZE'];

export default function WorkOrderCreate({ articles, aliases }: CreateProps) {
    const matcher = useMemo(() => new ArticleMatcher(articles, aliases), [articles, aliases]);
    const [text, setText] = useState('');
    const [warnings, setWarnings] = useState<string[]>([]);
    const [draft, setDraft] = useState(() => WorkOrderDraft.empty());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const readText = () => {
        const parsed = new WorkOrderTextParser().parse(text);

        setWarnings(parsed.groups.length ? parsed.warnings : ['Tidak ada artikel yang terbaca. Pastikan ada baris seperti "MARINA ONE SET (17)".', ...parsed.warnings]);
        if (parsed.groups.length) setDraft(WorkOrderDraft.fromParsed(parsed, matcher, text, draft));
    };

    const submit = () => {
        router.post(route('work-orders.store'), draft.toPayload(), {
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onError: (serverErrors) => setErrors(serverErrors),
        });
    };

    const update = (next: WorkOrderDraft) => setDraft(next);
    const problems = draft.problems;

    return (
        <AppLayout title="WO baru">
            <PageIntro
                actions={
                    <Button asChild variant="outline">
                        <Link href={route('work-orders.index')}>
                            <ArrowLeft />
                            Daftar WO
                        </Link>
                    </Button>
                }
            />

            <div className="flex flex-col gap-5 pb-28">
                <Section title="1. Tempel teks WA" icon={MessageSquareText}>
                    <div className="flex flex-col gap-3">
                        <Textarea
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            rows={8}
                            placeholder={SAMPLE}
                            className="font-mono text-base"
                            aria-label="Teks WO dari WhatsApp"
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={readText} disabled={!text.trim()}>
                                <WandSparkles />
                                Baca teks
                            </Button>
                            {text && (
                                <Button type="button" variant="outline" onClick={() => setText('')}>
                                    <X />
                                    Kosongkan
                                </Button>
                            )}
                        </div>
                        {warnings.length > 0 && (
                            <Alert className="border-stage-sewing/50 bg-stage-sewing/8">
                                <TriangleAlert className="text-stage-sewing" />
                                <AlertTitle>Periksa lagi</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc pl-4 text-base">
                                        {warnings.map((warning) => (
                                            <li key={warning}>{warning}</li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </Section>

                <Section title="2. Data WO" icon={ClipboardList}>
                    <div className="flex flex-col gap-4">
                        <WorkOrderHeaderFields values={draft.header} onChange={(changes) => update(draft.withHeader(changes))} errors={errors} idPrefix="wo-new" />
                        <label className="flex cursor-pointer items-start gap-3 rounded-md border-2 border-dashed p-4 has-[[data-state=checked]]:border-stage-ready has-[[data-state=checked]]:bg-stage-ready/8">
                            <Checkbox
                                checked={draft.header.is_opening_stock}
                                onCheckedChange={(checked) => update(draft.withHeader({ is_opening_stock: checked === true }))}
                                className="mt-0.5 size-6"
                            />
                            <span className="flex flex-col gap-0.5">
                                <span className="font-bold">Stok awal: barang sudah ada di gudang</span>
                            </span>
                        </label>
                    </div>
                </Section>

                <Section
                    title="3. Artikel"
                    icon={Shirt}
                    actions={
                        <Button type="button" variant="secondary" onClick={() => update(draft.addGroup())}>
                            <Plus />
                            Artikel
                        </Button>
                    }
                >
                    <div className="flex flex-col gap-4">
                        {draft.groups.map((group, index) => (
                            <GroupCard key={group.key} index={index} group={group} draft={draft} articles={articles} onChange={update} />
                        ))}
                        {draft.groups.length === 0 && (
                            <p className="rounded-md border border-dashed p-6 text-center text-muted-foreground">Belum ada artikel. Tempel teks WA atau tekan "+ Artikel".</p>
                        )}
                    </div>
                    <datalist id="size-options">
                        {SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size} />
                        ))}
                    </datalist>
                </Section>

                {Object.keys(errors).length > 0 && (
                    <Alert variant="destructive">
                        <TriangleAlert />
                        <AlertTitle>Belum bisa disimpan</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-4 text-base">
                                {[...new Set(Object.values(errors))].map((message) => (
                                    <li key={message}>{message}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            <StickyBar title={`${draft.totalQty} pcs · ${draft.groups.length} artikel`} subtitle={problems[0] ?? 'Siap disimpan.'}>
                <Button type="button" size="lg" onClick={submit} disabled={processing || problems.length > 0}>
                    <Save />
                    Simpan WO
                </Button>
            </StickyBar>
        </AppLayout>
    );
}

type GroupCardProps = {
    index: number;
    group: DraftGroup;
    draft: WorkOrderDraft;
    articles: CatalogArticle[];
    onChange: (draft: WorkOrderDraft) => void;
};

function GroupCard({ index, group, draft, articles, onChange }: GroupCardProps) {
    const counted = WorkOrderDraft.countedQty(group);
    const totalMatches = group.declaredQty === null || group.declaredQty === counted;

    return (
        <div className="rounded-lg border-2 bg-background/60">
            <div className="flex flex-wrap items-start gap-3 border-b p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">{index + 1}</span>
                <div className="flex min-w-0 flex-1 basis-56 flex-col gap-2">
                    {group.alias && (
                        <p className="text-sm text-muted-foreground">
                            Dari WA: <span className="font-semibold text-foreground">{group.alias}</span>
                            {group.declaredQty !== null && ` (${group.declaredQty})`}
                        </p>
                    )}
                    <ArticlePicker
                        articles={articles}
                        value={group.articleId}
                        suggestedName={group.alias}
                        onChange={(articleId) => onChange(draft.withGroup(group.key, { articleId }))}
                        className="sm:max-w-md"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-0.5">
                        <Button
                            type="button"
                            size="sm"
                            variant={group.itemType === 'print' ? 'default' : 'ghost'}
                            className="h-7 px-2.5 text-xs"
                            onClick={() => onChange(draft.withGroup(group.key, { itemType: 'print' }))}
                        >
                            Print
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={group.itemType === 'polosan' ? 'default' : 'ghost'}
                            className="h-7 px-2.5 text-xs"
                            onClick={() => onChange(draft.withGroup(group.key, { itemType: 'polosan' }))}
                        >
                            Polosan
                        </Button>
                    </div>
                    {totalMatches ? (
                        <ToneBadge tone="done">{counted} pcs</ToneBadge>
                    ) : (
                        <ToneBadge tone="revision">
                            Tertulis {group.declaredQty}, terhitung {counted}
                        </ToneBadge>
                    )}
                    <Button type="button" variant="ghost" size="icon" onClick={() => onChange(draft.removeGroup(group.key))} aria-label="Hapus artikel ini">
                        <Trash2 className="text-destructive" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-2 p-3">
                <div className="hidden grid-cols-[1fr_8rem_11rem_2.75rem] gap-2 px-1 text-sm font-semibold text-muted-foreground md:grid">
                    <span>Warna</span>
                    <span>Ukuran</span>
                    <span>Jumlah</span>
                    <span />
                </div>
                {group.lines.map((line) => (
                    <div key={line.key} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border bg-card p-2 md:grid-cols-[1fr_8rem_11rem_2.75rem] md:border-0 md:bg-transparent md:p-0">
                        <Input
                            value={line.color}
                            onChange={(event) => onChange(draft.withLine(group.key, line.key, { color: event.target.value }))}
                            placeholder="Warna"
                            aria-label="Warna"
                            className="order-1"
                        />
                        <Input
                            value={line.size}
                            onChange={(event) => onChange(draft.withLine(group.key, line.key, { size: event.target.value.toUpperCase() }))}
                            list="size-options"
                            placeholder="Ukuran"
                            aria-label="Ukuran"
                            className="order-3 font-semibold uppercase md:order-2"
                        />
                        <QtyStepper
                            value={line.qty}
                            min={1}
                            onChange={(qty) => onChange(draft.withLine(group.key, line.key, { qty }))}
                            label="Jumlah"
                            className="order-4 md:order-3"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onChange(draft.removeLine(group.key, line.key))}
                            aria-label="Hapus baris"
                            className="order-2 justify-self-end md:order-4"
                        >
                            <X />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" className="self-start" onClick={() => onChange(draft.addLine(group.key))}>
                    <Plus />
                    Baris warna / ukuran
                </Button>
            </div>
        </div>
    );
}
