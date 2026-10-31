import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
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

function addDays(isoDate: string, days: number): string {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

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
                <div className="flex flex-col gap-1.5">
                    <Input id={id('category')} value={values.category} onChange={(event) => onChange({ category: event.target.value })} placeholder="mis. PRINT / POLOSAN" />
                    <div className="flex flex-wrap gap-1">
                        {(['PRINT', 'POLOSAN', 'CAMPURAN'] as const).map((cat) => (
                            <Button
                                key={cat}
                                type="button"
                                size="sm"
                                variant={values.category.toUpperCase() === cat ? 'default' : 'outline'}
                                className="h-7 px-2 text-xs"
                                onClick={() => onChange({ category: cat })}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>
                </div>
            </FormField>
            <FormField label="Tanggal WO" htmlFor={id('ordered_at')} error={errors.ordered_at}>
                <Input
                    id={id('ordered_at')}
                    type="date"
                    value={values.ordered_at}
                    onChange={(event) => {
                        const date = event.target.value;
                        onChange({
                            ordered_at: date,
                            due_at: values.due_at || (date ? addDays(date, 7) : ''),
                        });
                    }}
                />
            </FormField>
            <FormField label="Deadline" htmlFor={id('due_at')} error={errors.due_at}>
                <Input id={id('due_at')} type="date" value={values.due_at} onChange={(event) => onChange({ due_at: event.target.value })} />
            </FormField>
            <FormField label="Catatan" htmlFor={id('notes')} error={errors.notes} className="sm:col-span-2 lg:col-span-1">
                <Textarea id={id('notes')} rows={1} value={values.notes} onChange={(event) => onChange({ notes: event.target.value })} className="min-h-11 text-base" />
            </FormField>
        </div>
    );
}
