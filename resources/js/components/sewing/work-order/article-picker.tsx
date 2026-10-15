import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatIdr } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import type { CatalogArticle } from '@/types/sewing';
import { router } from '@inertiajs/react';
import { Check, ChevronsUpDown, Plus, Search, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';

type ArticlePickerProps = {
    articles: CatalogArticle[];
    value: number | null;
    onChange: (articleId: number) => void;
    /** Name as typed in WhatsApp, used to pre-fill the search and the "new article" form. */
    suggestedName?: string | null;
    className?: string;
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

/** "GAVITA" from a shouted WhatsApp message becomes "Gavita". */
const titleCase = (value: string) => normalize(value).replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

/** Full-height searchable article list in a sheet, with an inline "add manual article" form. */
export function ArticlePicker({ articles, value, onChange, suggestedName, className }: ArticlePickerProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const selected = articles.find((article) => article.id === value);

    const filtered = useMemo(() => {
        const needle = normalize(query);

        return needle ? articles.filter((article) => normalize(`${article.display_name} ${article.brand_name ?? ''}`).includes(needle)) : articles;
    }, [articles, query]);

    const choose = (articleId: number) => {
        onChange(articleId);
        setOpen(false);
    };

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) setQuery(suggestedName ? (suggestedName.split(' ')[0] ?? '') : '');
            }}
        >
            <SheetTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={cn('h-auto min-h-11 w-full justify-between py-2 text-left whitespace-normal', !selected && 'border-stage-revision/60 bg-stage-revision/8 text-stage-revision', className)}
                >
                    {selected ? (
                        <span className="flex flex-col">
                            <span className="font-bold">{selected.display_name}</span>
                            <span className="text-sm font-normal text-muted-foreground">
                                {[selected.brand_name, selected.sewing_rate ? `Tarif ${formatIdr(selected.sewing_rate)}` : 'Tarif belum diisi'].filter(Boolean).join(' · ')}
                            </span>
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <TriangleAlert />
                            Pilih artikel
                        </span>
                    )}
                    <ChevronsUpDown className="text-muted-foreground" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="text-2xl">Pilih artikel</SheetTitle>
                    {suggestedName && <SheetDescription className="text-base">Di teks WA tertulis: "{suggestedName}"</SheetDescription>}
                </SheetHeader>

                <div className="relative px-4">
                    <Search className="pointer-events-none absolute top-1/2 left-7 size-5 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama artikel…" className="pl-10" autoFocus />
                </div>

                <div className="mt-3 flex-1 overflow-y-auto px-4 pb-4">
                    <ul className="flex flex-col gap-2">
                        {filtered.map((article) => (
                            <li key={article.id}>
                                <button
                                    type="button"
                                    onClick={() => choose(article.id)}
                                    className={cn(
                                        'flex min-h-14 w-full items-center justify-between gap-3 rounded-md border bg-card px-4 py-2 text-left hover:bg-accent focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none',
                                        article.id === value && 'border-primary bg-primary/15',
                                    )}
                                >
                                    <span className="flex flex-col">
                                        <span className="text-base font-bold">{article.display_name}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {[article.brand_name, article.source === 'packingv2' ? 'packingv2' : 'manual'].filter(Boolean).join(' · ')}
                                        </span>
                                    </span>
                                    {article.id === value && <Check className="size-5 text-stage-done" />}
                                </button>
                            </li>
                        ))}
                        {filtered.length === 0 && <li className="rounded-md border border-dashed p-4 text-center text-muted-foreground">Tidak ada artikel yang cocok.</li>}
                    </ul>

                    <NewArticleForm initialName={query || suggestedName || ''} onCreated={choose} />
                </div>
            </SheetContent>
        </Sheet>
    );
}

function NewArticleForm({ initialName, onCreated }: { initialName: string; onCreated: (articleId: number) => void }) {
    const [expanded, setExpanded] = useState(false);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [error, setError] = useState<string>();
    const [processing, setProcessing] = useState(false);

    if (!expanded) {
        return (
            <Button
                type="button"
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => {
                    setName(titleCase(initialName));
                    setExpanded(true);
                }}
            >
                <Plus />
                Artikel belum ada? Tambah baru
            </Button>
        );
    }

    const submit = () => {
        router.post(
            route('articles.store'),
            { name, category_name: category || null },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onError: (errors) => setError(errors.name ?? Object.values(errors)[0]),
                onSuccess: (page) => {
                    const createdId = (page.props as unknown as SharedData).flash.created_article_id;

                    if (createdId) onCreated(createdId);
                    setExpanded(false);
                },
            },
        );
    };

    return (
        <div className="mt-4 flex flex-col gap-3 rounded-md border-2 border-dashed border-primary/60 bg-primary/8 p-4">
            <p className="font-semibold">Artikel baru (manual)</p>
            <FormField label="Nama artikel" htmlFor="new-article-name" error={error}>
                <Input id="new-article-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="mis. Marina" />
            </FormField>
            <FormField label="Jenis (opsional)" htmlFor="new-article-category">
                <Input id="new-article-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="mis. One Set / Dress" />
            </FormField>
            <p className="text-sm text-muted-foreground">Tarif jahitnya diisi owner di menu Artikel & tarif.</p>
            <div className="flex gap-2">
                <Button type="button" onClick={submit} disabled={processing || !name.trim()} className="flex-1">
                    Simpan artikel
                </Button>
                <Button type="button" variant="outline" onClick={() => setExpanded(false)}>
                    Batal
                </Button>
            </div>
        </div>
    );
}
