import { FormField } from '@/components/form-field';
import { OptionSelect } from '@/components/option-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Assignment } from '@/types';
import { useForm } from '@inertiajs/react';
import { ClipboardCheck } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';
import { QuickQty } from './quick-qty';

type CompletionFormProps = {
    assignments: Assignment[];
    idPrefix: string;
    quickQty?: boolean;
    /** Lets a parent pre-select an assignment; pass a new object per click so repeats re-apply. */
    preset?: { assignmentId: string };
};

/** Record a (possibly partial) completed quantity for an active assignment. */
export function CompletionForm({ assignments, idPrefix, quickQty = false, preset }: CompletionFormProps) {
    const form = useForm({ tailor_assignment_id: '', completed_qty: '', completed_at: '', notes: '' });
    const selected = assignments.find((assignment) => String(assignment.id) === form.data.tailor_assignment_id);

    useEffect(() => {
        if (preset) form.setData('tailor_assignment_id', preset.assignmentId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preset]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!form.data.tailor_assignment_id) return;

        form.post(route('assignments.completions.store', form.data.tailor_assignment_id), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <form className="flex flex-col gap-3" onSubmit={submit}>
            <FormField label="Pekerjaan aktif" htmlFor={`${idPrefix}-assignment`} error={form.errors.tailor_assignment_id}>
                <OptionSelect
                    id={`${idPrefix}-assignment`}
                    value={form.data.tailor_assignment_id}
                    onValueChange={(value) => form.setData('tailor_assignment_id', value)}
                    options={assignments.map((assignment) => ({
                        value: String(assignment.id),
                        label: `${assignment.tailor_name} - ${assignment.article_name} (sisa ${assignment.remaining_qty})`,
                    }))}
                    placeholder="Pilih pekerjaan"
                />
            </FormField>
            {selected && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                    <p className="font-medium">{selected.tailor_name}</p>
                    <p className="text-muted-foreground">
                        {selected.article_name} · sisa {selected.remaining_qty} pcs
                    </p>
                </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Qty selesai" htmlFor={`${idPrefix}-qty`} error={form.errors.completed_qty}>
                    <Input
                        id={`${idPrefix}-qty`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={form.data.completed_qty}
                        onChange={(event) => form.setData('completed_qty', event.target.value)}
                    />
                </FormField>
                <FormField label="Tanggal selesai" htmlFor={`${idPrefix}-date`} error={form.errors.completed_at}>
                    <Input
                        id={`${idPrefix}-date`}
                        type="datetime-local"
                        value={form.data.completed_at}
                        onChange={(event) => form.setData('completed_at', event.target.value)}
                    />
                </FormField>
            </div>
            {quickQty && (
                <QuickQty
                    amounts={[1, 5, 10]}
                    max={selected?.remaining_qty}
                    maxLabel="Sisa"
                    onPick={(qty) => form.setData('completed_qty', qty)}
                />
            )}
            <Textarea
                aria-label="Catatan selesai"
                rows={2}
                placeholder="Catatan"
                value={form.data.notes}
                onChange={(event) => form.setData('notes', event.target.value)}
            />
            <Button type="submit" disabled={form.processing || !form.data.tailor_assignment_id}>
                <ClipboardCheck />
                Simpan Qty Selesai
            </Button>
        </form>
    );
}
