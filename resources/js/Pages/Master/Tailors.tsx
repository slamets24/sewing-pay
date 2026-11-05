import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { ActiveChoice, ChoiceButtons } from '@/components/sewing/master/choice-buttons';
import { FormSheet } from '@/components/sewing/master/form-sheet';
import { SearchBox } from '@/components/sewing/master/search-box';
import { PageIntro, Section } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SheetState } from '@/domain/master/sheet-state';
import { TailorDirectory, TailorForm, type TailorFormData } from '@/domain/master/tailor-directory';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { TailorRecord } from '@/types/sewing';
import { router, useForm } from '@inertiajs/react';
import { Pencil, Phone, RefreshCw, UserPlus, Users, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

type TailorsProps = {
    tailors: TailorRecord[];
    nextCode: string;
};

/** Name · type · contact · button, as one table-like row from lg up. */
const ROW_GRID = 'lg:grid lg:grid-cols-[minmax(0,1.4fr)_7rem_minmax(0,2fr)_6rem] lg:items-center lg:gap-4';

export default function Tailors({ tailors, nextCode }: TailorsProps) {
    const directory = useMemo(() => new TailorDirectory(tailors), [tailors]);
    const [query, setQuery] = useState('');
    const [sheet, setSheet] = useState(() => SheetState.closed<TailorRecord>());
    const visible = useMemo(() => directory.search(query), [directory, query]);

    const openFor = (tailor: TailorRecord | null) => setSheet((current) => current.openFor(tailor));

    return (
        <AppLayout title="Penjahit">
            <PageIntro
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.post(route('tailors.sync-hr'), {}, { preserveScroll: true })}
                        >
                            <RefreshCw />
                            Tarik dari HR
                        </Button>
                        <Button onClick={() => openFor(null)}>
                            <UserPlus />
                            Tambah penjahit
                        </Button>
                    </div>
                }
            />

            <Section title="Daftar penjahit" icon={Users} description={<TailorCounts directory={directory} />}>
                <SearchBox value={query} onChange={setQuery} placeholder="Cari nama atau kode…" label="Cari penjahit" className="mb-4 md:max-w-md" />

                {visible.length === 0 ? (
                    <EmptyState className="text-base">
                        {tailors.length === 0 ? 'Belum ada penjahit. Tekan "Tambah penjahit" untuk mulai.' : `Tidak ada penjahit dengan nama atau kode "${query}".`}
                    </EmptyState>
                ) : (
                    <TailorList tailors={visible} onEdit={openFor} />
                )}
            </Section>

            <TailorSheet key={sheet.session} state={sheet} nextCode={nextCode} onOpenChange={(open) => setSheet((current) => current.withOpen(open))} />
        </AppLayout>
    );
}

function TailorCounts({ directory }: { directory: TailorDirectory }) {
    const parts = [
        `${directory.activeCount} aktif`,
        `${directory.countOfType('internal')} internal`,
        `${directory.countOfType('makloon')} makloon`,
        directory.inactiveCount > 0 ? `${directory.inactiveCount} nonaktif` : null,
    ];

    return <>{parts.filter(Boolean).join(' · ')}</>;
}

function TailorList({ tailors, onEdit }: { tailors: TailorRecord[]; onEdit: (tailor: TailorRecord) => void }) {
    return (
        <div className="lg:overflow-hidden lg:rounded-lg lg:border">
            <div className={cn(ROW_GRID, 'hidden border-b bg-muted/60 px-4 py-2 text-sm font-bold tracking-wide text-muted-foreground uppercase')} aria-hidden>
                <span>Nama</span>
                <span>Jenis</span>
                <span>WhatsApp</span>
                <span />
            </div>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 lg:gap-0 lg:divide-y">
                {tailors.map((tailor) => (
                    <TailorRow key={tailor.id} tailor={tailor} onEdit={() => onEdit(tailor)} />
                ))}
            </ul>
        </div>
    );
}

function TailorRow({ tailor, onEdit }: { tailor: TailorRecord; onEdit: () => void }) {
    return (
        <li
            className={cn(
                ROW_GRID,
                'flex flex-col gap-3 rounded-lg border p-4 lg:rounded-none lg:border-0 lg:px-4 lg:py-3',
                tailor.is_active ? 'bg-card' : 'border-dashed bg-muted/70',
            )}
        >
            <div className="min-w-0">
                <p className={cn('text-lg leading-tight font-bold wrap-anywhere', !tailor.is_active && 'text-muted-foreground')}>{tailor.name}</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-semibold tabular">{tailor.code ?? 'Tanpa kode'}</span>
                    {tailor.hr_employee_number && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-medium text-foreground">
                            NIK: {tailor.hr_employee_number}
                        </span>
                    )}
                </div>
                {tailor.tenure_label && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        Masa kerja: <strong className="text-foreground">{tailor.tenure_label}</strong>
                    </p>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <ToneBadge tone={TailorDirectory.typeTone(tailor.type)}>{tailor.type_label}</ToneBadge>
                {!tailor.is_active && <ToneBadge tone="neutral">Nonaktif</ToneBadge>}
            </div>

            <div className="flex min-w-0 flex-col gap-3 lg:gap-1">
                <InfoCell icon={Phone} label="WhatsApp" value={tailor.whatsapp_number} empty="WA belum diisi" />
            </div>

            <Button variant="outline" onClick={onEdit} className="w-full" aria-label={`Ubah data ${tailor.name}`}>
                <Pencil />
                Ubah
            </Button>
        </li>
    );
}

function InfoCell({ icon: Icon, label, value, empty }: { icon: LucideIcon; label: string; value: string | null; empty: string }) {
    return (
        <div className="min-w-0">
            <p className="text-sm font-semibold text-muted-foreground lg:sr-only">{label}</p>
            <p className={cn('flex items-center gap-2 text-base', !value && 'text-muted-foreground')}>
                <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 wrap-anywhere">{value ?? empty}</span>
            </p>
        </div>
    );
}

type TailorSheetProps = {
    state: SheetState<TailorRecord>;
    nextCode: string;
    onOpenChange: (open: boolean) => void;
};

/** Add or edit one tailor. Remounted for every opening (keyed by session), so it always starts from fresh values. */
function TailorSheet({ state, nextCode, onOpenChange }: TailorSheetProps) {
    const tailor = state.target;
    const form = useForm<TailorFormData>(tailor ? TailorForm.fromRecord(tailor) : TailorForm.blank(nextCode));
    form.transform(TailorForm.payload);

    const submit = () => {
        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (tailor) {
            form.patch(route('tailors.update', tailor.id), options);
        } else {
            form.post(route('tailors.store'), options);
        }
    };

    return (
        <FormSheet
            open={state.open}
            onOpenChange={onOpenChange}
            title={tailor ? 'Ubah penjahit' : 'Tambah penjahit'}
            description={tailor?.name}
            processing={form.processing}
            onSubmit={submit}
        >
            <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <FormField label="Kode" htmlFor="tailor-code" error={form.errors.code}>
                    <Input
                        id="tailor-code"
                        value={form.data.code}
                        onChange={(event) => form.setData('code', event.target.value)}
                        aria-invalid={!!form.errors.code || undefined}
                        className="font-semibold tabular"
                    />
                </FormField>
                <FormField label="Nama penjahit" htmlFor="tailor-name" error={form.errors.name}>
                    <Input
                        id="tailor-name"
                        value={form.data.name}
                        onChange={(event) => form.setData('name', event.target.value)}
                        aria-invalid={!!form.errors.name || undefined}
                        autoComplete="off"
                    />
                </FormField>
            </div>

            <FormField label="Jenis penjahit" error={form.errors.type}>
                <ChoiceButtons label="Jenis penjahit" value={form.data.type} options={TailorDirectory.typeOptions} onChange={(type) => form.setData('type', type)} />
            </FormField>

            <FormField label="Nomor WhatsApp" htmlFor="tailor-wa" error={form.errors.whatsapp_number}>
                <Input
                    id="tailor-wa"
                    type="tel"
                    inputMode="tel"
                    placeholder="Contoh: 0812 3456 7890"
                    value={form.data.whatsapp_number}
                    onChange={(event) => form.setData('whatsapp_number', event.target.value)}
                    aria-invalid={!!form.errors.whatsapp_number || undefined}
                />
            </FormField>

            <FormField label="Alamat" htmlFor="tailor-address" error={form.errors.address}>
                <Textarea id="tailor-address" rows={2} className="text-base md:text-base" value={form.data.address} onChange={(event) => form.setData('address', event.target.value)} />
            </FormField>

            <FormField label="Catatan" htmlFor="tailor-notes" error={form.errors.notes}>
                <Textarea id="tailor-notes" rows={2} className="text-base md:text-base" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
            </FormField>

            {tailor && (
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
