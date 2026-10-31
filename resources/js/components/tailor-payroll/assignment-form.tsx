import { FormField } from '@/components/form-field';
import { OptionSelect } from '@/components/option-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { joinMeta } from '@/lib/format';
import type { Article, Tailor } from '@/types';
import { useForm } from '@inertiajs/react';
import { Scissors } from 'lucide-react';
import type { FormEvent } from 'react';
import { QuickQty } from './quick-qty';

type AssignmentFormProps = {
    articles: Article[];
    tailors: Tailor[];
    idPrefix: string;
    quickQty?: boolean;
};

/** A tailor picks up part of an available article; the rate is snapshotted server-side. */
export function AssignmentForm({ articles, tailors, idPrefix, quickQty = false }: AssignmentFormProps) {
    const form = useForm({ tailor_id: '', production_article_id: '', assigned_qty: '', assigned_at: '', due_at: '', notes: '' });
    const selectedArticle = articles.find((article) => String(article.id) === form.data.production_article_id);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('assignments.store'), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <form className="flex flex-col gap-3" onSubmit={submit}>
            <FormField label="Hancaan" htmlFor={`${idPrefix}-article`} error={form.errors.production_article_id}>
                <OptionSelect
                    id={`${idPrefix}-article`}
                    value={form.data.production_article_id}
                    onValueChange={(value) => form.setData('production_article_id', value)}
                    options={articles.map((article) => ({
                        value: String(article.id),
                        label: `${joinMeta(article.article_name, article.color, article.size)} - ${article.available_qty} tersedia`,
                    }))}
                    placeholder="Pilih hancaan"
                />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Penjahit" htmlFor={`${idPrefix}-tailor`} error={form.errors.tailor_id}>
                    <OptionSelect
                        id={`${idPrefix}-tailor`}
                        value={form.data.tailor_id}
                        onValueChange={(value) => form.setData('tailor_id', value)}
                        options={tailors.map((tailor) => ({ value: String(tailor.id), label: tailor.name }))}
                        placeholder="Pilih penjahit"
                    />
                </FormField>
                <FormField label="Qty diambil" htmlFor={`${idPrefix}-qty`} error={form.errors.assigned_qty}>
                    <Input
                        id={`${idPrefix}-qty`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={form.data.assigned_qty}
                        onChange={(event) => form.setData('assigned_qty', event.target.value)}
                    />
                </FormField>
            </div>
            {quickQty && (
                <QuickQty
                    amounts={[5, 10, 20]}
                    max={selectedArticle?.available_qty}
                    maxLabel="Semua"
                    onPick={(qty) => form.setData('assigned_qty', qty)}
                />
            )}
            <Textarea
                aria-label="Catatan pengambilan"
                rows={2}
                placeholder="Catatan"
                value={form.data.notes}
                onChange={(event) => form.setData('notes', event.target.value)}
            />
            <Button type="submit" disabled={form.processing || !articles.length}>
                <Scissors />
                Catat Pengambilan
            </Button>
        </form>
    );
}
