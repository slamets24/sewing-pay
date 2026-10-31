import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { ActiveChoice } from '@/components/sewing/master/choice-buttons';
import { FormSheet } from '@/components/sewing/master/form-sheet';
import { MoneyField } from '@/components/sewing/master/money-field';
import { PageIntro, Section } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MaterialTypes, RevisionPartForm, type RevisionPartFormData } from '@/domain/master/revision-part-form';
import { SheetState } from '@/domain/master/sheet-state';
import AppLayout from '@/layouts/app-layout';
import { formatIdr } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { RevisionPartRecord } from '@/types/sewing';
import { useForm } from '@inertiajs/react';
import { Check, Pencil, Plus, Scissors } from 'lucide-react';
import { useMemo, useState } from 'react';

type RevisionPartsProps = {
    parts: RevisionPartRecord[];
};

export default function RevisionParts({ parts }: RevisionPartsProps) {
    const [sheet, setSheet] = useState(() => SheetState.closed<RevisionPartRecord>());
    const suggestions = useMemo(() => MaterialTypes.suggestions(parts), [parts]);
    const activeCount = parts.filter((part) => part.is_active !== false).length;

    const openFor = (part: RevisionPartRecord | null) => setSheet((current) => current.openFor(part));

    return (
        <AppLayout title="Bagian revisi">
            <PageIntro
                actions={
                    <Button onClick={() => openFor(null)}>
                        <Plus />
                        Tambah bagian
                    </Button>
                }
            />

            <Section title="Daftar harga" icon={Scissors} description={`${activeCount} bagian aktif dari ${parts.length}`}>
                {parts.length === 0 ? (
                    <EmptyState className="text-base">Belum ada bagian revisi. Tekan "Tambah bagian" untuk mulai.</EmptyState>
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {parts.map((part) => (
                            <PartCard key={part.id} part={part} onEdit={() => openFor(part)} />
                        ))}
                    </ul>
                )}


            </Section>

            <RevisionPartSheet
                key={sheet.session}
                state={sheet}
                suggestions={suggestions}
                onOpenChange={(open) => setSheet((current) => current.withOpen(open))}
            />
        </AppLayout>
    );
}

function PartCard({ part, onEdit }: { part: RevisionPartRecord; onEdit: () => void }) {
    const active = part.is_active !== false;

    return (
        <li className={cn('flex min-w-0 flex-col gap-3 rounded-lg border p-4', active ? 'bg-card' : 'border-dashed bg-muted/70')}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <p className={cn('min-w-0 flex-1 text-lg leading-tight font-bold wrap-anywhere', !active && 'text-muted-foreground')}>{part.name}</p>
                <div className="flex flex-wrap gap-1.5">
                    <ToneBadge tone={MaterialTypes.tone(part.material_type)}>{part.material_type}</ToneBadge>
                    {!active && <ToneBadge tone="neutral">Nonaktif</ToneBadge>}
                </div>
            </div>

            <p className="flex items-baseline gap-2">
                <span className="font-display text-3xl leading-tight font-bold tabular">{formatIdr(part.price)}</span>
                <span className="text-sm text-muted-foreground">per pcs</span>
            </p>

            <Button variant="outline" onClick={onEdit} className="mt-auto" aria-label={`Ubah ${part.name}`}>
                <Pencil />
                Ubah
            </Button>
        </li>
    );
}

type RevisionPartSheetProps = {
    state: SheetState<RevisionPartRecord>;
    suggestions: string[];
    onOpenChange: (open: boolean) => void;
};

function RevisionPartSheet({ state, suggestions, onOpenChange }: RevisionPartSheetProps) {
    const part = state.target;
    const form = useForm<RevisionPartFormData>(part ? RevisionPartForm.fromRecord(part) : RevisionPartForm.blank());
    form.transform(RevisionPartForm.payload);

    const submit = () => {
        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (part) {
            form.patch(route('revision-parts.update', part.id), options);
        } else {
            form.post(route('revision-parts.store'), options);
        }
    };

    return (
        <FormSheet
            open={state.open}
            onOpenChange={onOpenChange}
            title={part ? 'Ubah bagian' : 'Tambah bagian'}
            description={part?.name}
            processing={form.processing}
            onSubmit={submit}
        >
            <FormField label="Nama bagian" htmlFor="part-name" error={form.errors.name}>
                <Input
                    id="part-name"
                    value={form.data.name}
                    onChange={(event) => form.setData('name', event.target.value)}
                    aria-invalid={!!form.errors.name || undefined}
                    autoComplete="off"
                />
            </FormField>

            <FormField label="Harga per pcs" htmlFor="part-price" error={form.errors.price}>
                <MoneyField id="part-price" value={form.data.price} onChange={(price) => form.setData('price', price)} invalid={!!form.errors.price} />
            </FormField>

            <FormField label="Jenis bahan" htmlFor="part-material" error={form.errors.material_type}>
                <Input
                    id="part-material"
                    value={form.data.material_type}
                    onChange={(event) => form.setData('material_type', event.target.value)}
                    aria-invalid={!!form.errors.material_type || undefined}
                    autoComplete="off"
                />
                <div className="flex flex-wrap gap-2" role="group" aria-label="Pilihan cepat jenis bahan">
                    {suggestions.map((type) => {
                        const selected = form.data.material_type.trim().toLowerCase() === type;

                        return (
                            <Button
                                key={type}
                                type="button"
                                variant={selected ? 'default' : 'outline'}
                                aria-pressed={selected}
                                className="rounded-full"
                                onClick={() => form.setData('material_type', type)}
                            >
                                {selected && <Check />}
                                {type}
                            </Button>
                        );
                    })}
                </div>
            </FormField>

            {part && (
                <FormField label="Status" error={form.errors.is_active}>
                    <ActiveChoice
                        value={form.data.is_active}
                        onChange={(active) => form.setData('is_active', active)}
                    />
                </FormField>
            )}
        </FormSheet>
    );
}
