import { ChoiceChip } from '@/components/choice-chip';
import { FormField, InputError } from '@/components/form-field';
import { OptionSelect } from '@/components/option-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HancaanSuggestionBook } from '@/models/hancaan-suggestion-book';
import { VariantMatrix } from '@/models/variant-matrix';
import { WorkTypeCatalog } from '@/models/work-type-catalog';
import type { HancaanSuggestions, WorkType } from '@/types';
import { useForm } from '@inertiajs/react';
import { PackagePlus, Plus } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

type HancaanMatrixFormProps = {
    workTypes: WorkType[];
    suggestions: HancaanSuggestions;
    idPrefix: string;
};

type TariffSource = 'auto' | 'manual' | null;

/** One article, many colour/size variants: pick colours and sizes as chips, then fill the qty grid. */
export function HancaanMatrixForm({ workTypes, suggestions, idPrefix }: HancaanMatrixFormProps) {
    const catalog = useMemo(() => new WorkTypeCatalog(workTypes), [workTypes]);
    const book = useMemo(() => new HancaanSuggestionBook(suggestions), [suggestions]);
    const [matrix, setMatrix] = useState(VariantMatrix.empty);
    const [tariffSource, setTariffSource] = useState<TariffSource>(null);
    const [showNotes, setShowNotes] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);
    const form = useForm({ work_type_id: '', article_name: '', notes: '' });

    const errors = form.errors as Partial<Record<string, string>>;
    const variantError = errors.variants ?? Object.entries(errors).find(([key]) => key.startsWith('variants.'))?.[1];
    const canSubmit = matrix.variantCount > 0 && form.data.article_name.trim() !== '' && form.data.work_type_id !== '';

    const changeArticleName = (articleName: string) => {
        const remembered = book.workTypeFor(articleName);
        const autoFill = tariffSource !== 'manual' && remembered !== null && catalog.has(remembered);

        form.setData((data) => ({ ...data, article_name: articleName, work_type_id: autoFill ? String(remembered) : data.work_type_id }));
        if (autoFill) setTariffSource('auto');
    };

    const changeTariff = (workTypeId: string) => {
        form.setData('work_type_id', workTypeId);
        setTariffSource('manual');
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({ ...data, variants: matrix.variants() }));
        form.post(route('hancaan.batch'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setMatrix(VariantMatrix.empty());
                setTariffSource(null);
                setShowNotes(false);
            },
        });
    };

    // Enter in a qty cell jumps to the next cell instead of submitting half-filled data.
    const focusNextCell = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
        if (event.key !== 'Enter') return;

        event.preventDefault();
        gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${index + 1}"]`)?.focus();
    };

    return (
        <form className="flex flex-col gap-4" onSubmit={submit}>
            <FormField label="Nama artikel" htmlFor={`${idPrefix}-article`} error={form.errors.article_name}>
                <Input
                    id={`${idPrefix}-article`}
                    list={`${idPrefix}-article-options`}
                    autoComplete="off"
                    placeholder="Kemeja Oxford"
                    value={form.data.article_name}
                    onChange={(event) => changeArticleName(event.target.value)}
                />
                <datalist id={`${idPrefix}-article-options`}>
                    {book.articleNames.map((name) => (
                        <option key={name} value={name} />
                    ))}
                </datalist>
            </FormField>

            <FormField label="Tarif kerja" htmlFor={`${idPrefix}-work-type`} error={form.errors.work_type_id}>
                <OptionSelect
                    id={`${idPrefix}-work-type`}
                    value={form.data.work_type_id}
                    onValueChange={changeTariff}
                    options={catalog.options()}
                    placeholder="Pilih tarif"
                />
                {tariffSource === 'auto' && <p className="text-xs text-muted-foreground">Diisi dari tarif terakhir artikel ini.</p>}
            </FormField>

            <ChipPicker
                id={`${idPrefix}-color`}
                label="Warna"
                choices={book.colorChoices(matrix.colors)}
                isSelected={(color) => matrix.hasColor(color)}
                onToggle={(color) => setMatrix(matrix.toggleColor(color))}
                onAdd={(color) => setMatrix(matrix.withColor(color))}
                addPlaceholder="Warna lain"
            />

            <ChipPicker
                id={`${idPrefix}-size`}
                label="Size"
                choices={book.sizeChoices(matrix.sizes)}
                isSelected={(size) => matrix.hasSize(size)}
                onToggle={(size) => setMatrix(matrix.toggleSize(size))}
                onAdd={(size) => setMatrix(matrix.withSize(size))}
                addPlaceholder="Size lain"
            />

            <div className="flex flex-col gap-2">
                <Label>Qty per varian</Label>
                <div ref={gridRef} className="overflow-x-auto rounded-lg border">
                    <table className="w-full border-collapse text-sm">
                        {!matrix.isSingleCell && (
                            <thead>
                                <tr className="bg-muted/50">
                                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">{matrix.colors.length ? 'Warna' : ''}</th>
                                    {matrix.columns.map((size) => (
                                        <th key={size ?? 'all'} className="px-1 py-1.5 text-center font-medium">
                                            {size ?? 'Qty'}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                        )}
                        <tbody>
                            {matrix.rows.map((color, rowIndex) => (
                                <tr key={color ?? 'all'} className="border-t first:border-t-0">
                                    <th scope="row" className="max-w-24 truncate px-2 py-1.5 text-left font-medium">
                                        {color ?? (matrix.isSingleCell ? 'Qty' : '—')}
                                    </th>
                                    {matrix.columns.map((size, columnIndex) => {
                                        const index = rowIndex * matrix.columns.length + columnIndex;
                                        const cellLabel = ['Qty', color, size].filter(Boolean).join(' ');

                                        return (
                                            <td key={size ?? 'all'} className="px-1 py-1">
                                                <Input
                                                    data-cell={index}
                                                    aria-label={cellLabel}
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={0}
                                                    placeholder="0"
                                                    value={matrix.qty(color, size) || ''}
                                                    onChange={(event) => setMatrix(matrix.withQty(color, size, Number(event.target.value)))}
                                                    onKeyDown={(event) => focusNextCell(event, index)}
                                                    className="mx-auto h-9 w-16 min-w-14 px-1 text-center tabular-nums"
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <InputError message={variantError} />
            </div>

            {showNotes ? (
                <FormField label="Catatan" htmlFor={`${idPrefix}-notes`} error={form.errors.notes}>
                    <Textarea
                        id={`${idPrefix}-notes`}
                        rows={2}
                        placeholder="Catatan opsional"
                        value={form.data.notes}
                        onChange={(event) => form.setData('notes', event.target.value)}
                    />
                </FormField>
            ) : (
                <Button type="button" variant="link" className="h-auto self-start p-0" onClick={() => setShowNotes(true)}>
                    Tambah catatan
                </Button>
            )}

            <div className="flex flex-col gap-2 border-t pt-3">
                <p className="text-sm text-muted-foreground tabular-nums">
                    {matrix.variantCount} hancaan · {matrix.totalQty} pcs
                </p>
                <Button type="submit" size="lg" disabled={form.processing || !canSubmit}>
                    <PackagePlus />
                    {matrix.variantCount > 1 ? `Simpan ${matrix.variantCount} hancaan` : 'Simpan hancaan'}
                </Button>
            </div>
        </form>
    );
}

type ChipPickerProps = {
    id: string;
    label: string;
    choices: string[];
    isSelected: (value: string) => boolean;
    onToggle: (value: string) => void;
    onAdd: (value: string) => void;
    addPlaceholder: string;
};

function ChipPicker({ id, label, choices, isSelected, onToggle, onAdd, addPlaceholder }: ChipPickerProps) {
    const [draft, setDraft] = useState('');

    const add = () => {
        if (!draft.trim()) return;

        onAdd(draft);
        setDraft('');
    };

    return (
        <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm leading-none font-medium">{label}</legend>
            {choices.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {choices.map((choice) => (
                        <ChoiceChip key={choice} selected={isSelected(choice)} onToggle={() => onToggle(choice)}>
                            {choice}
                        </ChoiceChip>
                    ))}
                </div>
            )}
            <div className="flex gap-2">
                <Input
                    id={id}
                    aria-label={addPlaceholder}
                    autoComplete="off"
                    placeholder={addPlaceholder}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;

                        event.preventDefault();
                        add();
                    }}
                />
                <Button type="button" variant="outline" onClick={add} aria-label={`Tambah ${label.toLowerCase()}`}>
                    <Plus />
                    Tambah
                </Button>
            </div>
        </fieldset>
    );
}
