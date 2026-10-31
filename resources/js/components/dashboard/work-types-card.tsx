import { FormField, InputError } from '@/components/form-field';
import { OptionSelect } from '@/components/option-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatIdr } from '@/lib/format';
import type { SelectOption, WorkType } from '@/types';
import { useForm } from '@inertiajs/react';
import { Plus, WalletCards } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type WorkTypesCardProps = {
    workTypes: WorkType[];
    categories: SelectOption[];
};

export function WorkTypesCard({ workTypes, categories }: WorkTypesCardProps) {
    const form = useForm({ code: '', name: '', category: 'regular', unit: 'pcs', rate_amount: '', notes: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('work-types.store'), { preserveScroll: true, onSuccess: () => form.reset('code', 'name', 'rate_amount', 'notes') });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <WalletCards className="size-4" />
                    Tarif Kerja
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <form className="flex flex-col gap-3" onSubmit={submit}>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FormField label="Kode" htmlFor="work-code" error={form.errors.code}>
                            <Input id="work-code" placeholder="JK-001" value={form.data.code} onChange={(event) => form.setData('code', event.target.value)} />
                        </FormField>
                        <FormField label="Kategori" htmlFor="work-category" error={form.errors.category}>
                            <OptionSelect id="work-category" value={form.data.category} onValueChange={(value) => form.setData('category', value)} options={categories} />
                        </FormField>
                    </div>
                    <FormField label="Nama pekerjaan" htmlFor="work-name" error={form.errors.name}>
                        <Input id="work-name" placeholder="Jahit kemeja" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                    </FormField>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FormField label="Tarif" htmlFor="work-rate" error={form.errors.rate_amount}>
                            <Input
                                id="work-rate"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                placeholder="5000"
                                value={form.data.rate_amount}
                                onChange={(event) => form.setData('rate_amount', event.target.value)}
                            />
                        </FormField>
                        <FormField label="Unit" htmlFor="work-unit" error={form.errors.unit}>
                            <Input id="work-unit" placeholder="pcs" value={form.data.unit} onChange={(event) => form.setData('unit', event.target.value)} />
                        </FormField>
                    </div>
                    <Button type="submit" disabled={form.processing}>
                        <Plus />
                        Simpan Tarif
                    </Button>
                </form>

                <div className="flex flex-col gap-2">
                    {workTypes.map((workType) => (
                        <WorkTypeRow key={workType.id} workType={workType} categories={categories} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function WorkTypeRow({ workType, categories }: { workType: WorkType; categories: SelectOption[] }) {
    const [editing, setEditing] = useState(false);
    const isActive = workType.is_active !== false;
    const form = useForm({
        code: workType.code ?? '',
        name: workType.name,
        category: workType.category ?? 'regular',
        unit: workType.unit ?? 'pcs',
        rate_amount: String(workType.rate_amount ?? ''),
        notes: workType.notes ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(route('work-types.update', workType.id), { preserveScroll: true, onSuccess: () => setEditing(false) });
    };

    const toggleStatus = () => form.post(route(isActive ? 'work-types.deactivate' : 'work-types.activate', workType.id), { preserveScroll: true });

    if (editing) {
        return (
            <form className="flex flex-col gap-3 rounded-lg border p-3" onSubmit={submit}>
                <div className="grid gap-2 sm:grid-cols-2">
                    <Input aria-label="Kode tarif" value={form.data.code} onChange={(event) => form.setData('code', event.target.value)} />
                    <Input aria-label="Nama tarif" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                    <OptionSelect aria-label="Kategori" value={form.data.category} onValueChange={(value) => form.setData('category', value)} options={categories} />
                    <Input
                        aria-label="Tarif"
                        type="number"
                        inputMode="numeric"
                        value={form.data.rate_amount}
                        onChange={(event) => form.setData('rate_amount', event.target.value)}
                    />
                    <Input aria-label="Unit" value={form.data.unit} onChange={(event) => form.setData('unit', event.target.value)} />
                </div>
                <Textarea aria-label="Catatan tarif" rows={2} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
                <InputError message={form.errors.name ?? form.errors.rate_amount} />
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
                    <p className="truncate text-sm font-medium">{workType.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                        {workType.code || 'Tanpa kode'} / {formatIdr(workType.rate_amount ?? 0)} per {workType.unit}
                    </p>
                </div>
                <Badge variant={isActive ? 'secondary' : 'outline'}>{isActive ? 'Aktif' : 'Nonaktif'}</Badge>
            </div>
            <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    Edit
                </Button>
                <Button size="sm" variant="outline" disabled={form.processing} onClick={toggleStatus}>
                    {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
            </div>
        </article>
    );
}
