import { InputError } from '@/components/form-field';
import { OptionSelect } from '@/components/option-select';
import { HancaanForm, workTypeOptions } from '@/components/tailor-payroll/hancaan-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { joinMeta } from '@/lib/format';
import type { Article, WorkType } from '@/types';
import { useForm } from '@inertiajs/react';
import { PackagePlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type HancaanCardProps = {
    articles: Article[];
    workTypes: WorkType[];
};

export function HancaanCard({ articles, workTypes }: HancaanCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <PackagePlus className="size-4" />
                    Hancaan Baru
                </CardTitle>
                <CardDescription>Artikel, warna, size, dan qty siap jahit.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <HancaanForm workTypes={workTypes} idPrefix="hancaan" />
                <div className="flex flex-col gap-2">
                    {articles.map((article) => (
                        <ArticleRow key={article.id} article={article} workTypes={workTypes} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function ArticleRow({ article, workTypes }: { article: Article; workTypes: WorkType[] }) {
    const [editing, setEditing] = useState(false);
    const form = useForm({
        work_type_id: String(article.work_type_id),
        article_name: article.article_name,
        color: article.color ?? '',
        size: article.size ?? '',
        planned_qty: String(article.planned_qty),
        ready_at: '',
        notes: '',
        production_article_id: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(route('hancaan.update', article.id), { preserveScroll: true, onSuccess: () => setEditing(false) });
    };

    const cancel = () => form.post(route('hancaan.cancel', article.id), { preserveScroll: true });

    if (editing) {
        return (
            <form className="flex flex-col gap-3 rounded-lg border p-3" onSubmit={submit}>
                <OptionSelect
                    aria-label="Tarif kerja"
                    value={form.data.work_type_id}
                    onValueChange={(value) => form.setData('work_type_id', value)}
                    options={workTypeOptions(workTypes)}
                    placeholder="Tarif kerja"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                    <Input aria-label="Nama artikel" value={form.data.article_name} onChange={(event) => form.setData('article_name', event.target.value)} />
                    <Input aria-label="Warna" value={form.data.color} onChange={(event) => form.setData('color', event.target.value)} />
                    <Input aria-label="Size" value={form.data.size} onChange={(event) => form.setData('size', event.target.value)} />
                    <Input
                        aria-label="Qty rencana"
                        type="number"
                        inputMode="numeric"
                        value={form.data.planned_qty}
                        onChange={(event) => form.setData('planned_qty', event.target.value)}
                    />
                </div>
                <Textarea aria-label="Catatan hancaan" rows={2} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
                <InputError message={form.errors.planned_qty ?? form.errors.article_name ?? form.errors.work_type_id} />
                <div className="flex gap-2">
                    <Button size="sm" type="submit" disabled={form.processing}>
                        Simpan
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => setEditing(false)}>
                        Batal
                    </Button>
                </div>
            </form>
        );
    }

    return (
        <article className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{article.article_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{joinMeta(article.color, article.size, article.work_type_name)}</p>
                </div>
                <Badge variant="secondary">{article.available_qty} siap</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>Plan {article.planned_qty}</span>
                <span>Ambil {article.assigned_qty}</span>
                <span>Selesai {article.completed_qty}</span>
            </div>
            <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    Edit
                </Button>
                <Button size="sm" variant="destructive" disabled={article.assigned_qty > 0 || form.processing} onClick={cancel}>
                    Batalkan
                </Button>
            </div>
            <InputError className="text-xs" message={form.errors.production_article_id} />
        </article>
    );
}
