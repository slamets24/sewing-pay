import { FormField } from '@/components/form-field';
import { OptionSelect } from '@/components/option-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatIdr } from '@/lib/format';
import type { WorkType } from '@/types';
import { useForm } from '@inertiajs/react';
import { PackagePlus } from 'lucide-react';
import type { FormEvent } from 'react';

export function workTypeOptions(workTypes: WorkType[]) {
    return workTypes.map((workType) => ({
        value: String(workType.id),
        label: `${workType.name} - ${formatIdr(workType.rate_amount ?? 0)}`,
    }));
}

/** Create a new production article ("hancaan") that tailors can pick up. */
export function HancaanForm({ workTypes, idPrefix }: { workTypes: WorkType[]; idPrefix: string }) {
    const form = useForm({ work_type_id: '', article_name: '', color: '', size: '', planned_qty: '', ready_at: '', notes: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('hancaan.store'), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <form className="flex flex-col gap-3" onSubmit={submit}>
            <FormField label="Tarif kerja" htmlFor={`${idPrefix}-work-type`} error={form.errors.work_type_id}>
                <OptionSelect
                    id={`${idPrefix}-work-type`}
                    value={form.data.work_type_id}
                    onValueChange={(value) => form.setData('work_type_id', value)}
                    options={workTypeOptions(workTypes)}
                    placeholder="Pilih tarif"
                />
            </FormField>
            <FormField label="Nama artikel" htmlFor={`${idPrefix}-article`} error={form.errors.article_name}>
                <Input
                    id={`${idPrefix}-article`}
                    autoComplete="off"
                    placeholder="Kemeja Oxford"
                    value={form.data.article_name}
                    onChange={(event) => form.setData('article_name', event.target.value)}
                />
            </FormField>
            <div className="grid grid-cols-3 gap-3">
                <FormField label="Warna" htmlFor={`${idPrefix}-color`} error={form.errors.color}>
                    <Input
                        id={`${idPrefix}-color`}
                        autoComplete="off"
                        placeholder="Navy"
                        value={form.data.color}
                        onChange={(event) => form.setData('color', event.target.value)}
                    />
                </FormField>
                <FormField label="Size" htmlFor={`${idPrefix}-size`} error={form.errors.size}>
                    <Input
                        id={`${idPrefix}-size`}
                        autoComplete="off"
                        placeholder="L"
                        value={form.data.size}
                        onChange={(event) => form.setData('size', event.target.value)}
                    />
                </FormField>
                <FormField label="Qty" htmlFor={`${idPrefix}-qty`} error={form.errors.planned_qty}>
                    <Input
                        id={`${idPrefix}-qty`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        placeholder="24"
                        value={form.data.planned_qty}
                        onChange={(event) => form.setData('planned_qty', event.target.value)}
                    />
                </FormField>
            </div>
            <Textarea
                aria-label="Catatan hancaan"
                rows={2}
                placeholder="Catatan opsional"
                value={form.data.notes}
                onChange={(event) => form.setData('notes', event.target.value)}
            />
            <Button type="submit" disabled={form.processing}>
                <PackagePlus />
                Simpan Hancaan
            </Button>
        </form>
    );
}
