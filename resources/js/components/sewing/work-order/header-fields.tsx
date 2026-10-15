import { FormField } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export type HeaderValues = {
    number: string;
    channel: string;
    category: string;
    ordered_at: string;
    due_at: string;
    notes: string;
};

type HeaderFieldsProps = {
    values: HeaderValues;
    onChange: (changes: Partial<HeaderValues>) => void;
    errors?: Partial<Record<keyof HeaderValues, string>>;
    idPrefix: string;
};

/** Number, channel, category, dates and notes of a work order; shared by "WO baru" and "Ubah WO". */
export function WorkOrderHeaderFields({ values, onChange, errors = {}, idPrefix }: HeaderFieldsProps) {
    const id = (field: string) => `${idPrefix}-${field}`;

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Nomor WO" htmlFor={id('number')} error={errors.number}>
                <Input id={id('number')} value={values.number} onChange={(event) => onChange({ number: event.target.value })} placeholder="mis. LOKA 324" className="font-bold" />
            </FormField>
            <FormField label="Channel / pemesan" htmlFor={id('channel')} error={errors.channel}>
                <Input id={id('channel')} value={values.channel} onChange={(event) => onChange({ channel: event.target.value })} placeholder="mis. Reseller & toko online" />
            </FormField>
            <FormField label="Kategori" htmlFor={id('category')} error={errors.category}>
                <Input id={id('category')} value={values.category} onChange={(event) => onChange({ category: event.target.value })} placeholder="mis. PRINT" />
            </FormField>
            <FormField label="Tanggal WO" htmlFor={id('ordered_at')} error={errors.ordered_at}>
                <Input id={id('ordered_at')} type="date" value={values.ordered_at} onChange={(event) => onChange({ ordered_at: event.target.value })} />
            </FormField>
            <FormField label="Deadline (opsional)" htmlFor={id('due_at')} error={errors.due_at}>
                <Input id={id('due_at')} type="date" value={values.due_at} onChange={(event) => onChange({ due_at: event.target.value })} />
            </FormField>
            <FormField label="Catatan (opsional)" htmlFor={id('notes')} error={errors.notes} className="sm:col-span-2 lg:col-span-1">
                <Textarea id={id('notes')} rows={1} value={values.notes} onChange={(event) => onChange({ notes: event.target.value })} className="min-h-11 text-base" />
            </FormField>
        </div>
    );
}
