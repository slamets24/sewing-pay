import { EmptyState } from '@/components/empty-state';
import { PurgeHistorySheet } from '@/components/sewing/activity/purge-history-sheet';
import { FormField } from '@/components/form-field';
import { PageIntro, Section } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import AppLayout from '@/layouts/app-layout';
import type { Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';
import type { SelectOption } from '@/types';
import { Link, router } from '@inertiajs/react';
import { ChevronDown, ClipboardList, History, LogIn, LogOut, Search, ShieldAlert, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Change = {
    id: number;
    event: 'created' | 'updated' | 'deleted';
    type: string | null;
    label: string | null;
    fields: { label: string; old: unknown; new: unknown }[];
};

type Entry = {
    id: string;
    at: string;
    event: 'action' | 'created' | 'updated' | 'deleted' | 'login' | 'logout' | 'login_failed';
    source: 'web' | 'api' | 'console' | 'system';
    user: { id: number | null; name: string; role: string | null };
    action: string;
    subject: { type: string | null; label: string } | null;
    work_order: { id: number; number: string | null } | null;
    tailor: { id: number; name: string | null } | null;
    email: string | null;
    change_count: number;
    changes: Change[];
};

type Filters = { user: number | null; wo: number | null; tailor: number | null; type: string | null; from: string | null; to: string | null; q: string | null; auth: boolean };

type Props = {
    entries: Entry[];
    filters: Filters;
    page: number;
    hasMore: boolean;
    options: { users: SelectOption[]; tailors: SelectOption[]; types: SelectOption[] };
    workOrderNumber: string | null;
    /** Only for the Owner (activity-logs.purge). */
    purge: { oldest: string | null; total: number } | null;
};

const CHANGE_WORD: Record<Change['event'], { word: string; tone: Tone }> = {
    created: { word: 'Tambah', tone: 'done' },
    updated: { word: 'Ubah', tone: 'ready' },
    deleted: { word: 'Hapus', tone: 'revision' },
};

const timeFormatter = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Riwayat aktivitas: siapa melakukan apa dan kapan, di semua menu. */
export default function ActivityLogIndex({ entries, filters, page, hasMore, options, workOrderNumber, purge }: Props) {
    const [purgeOpen, setPurgeOpen] = useState(false);
    const [draft, setDraft] = useState(filters);
    const [showFilters, setShowFilters] = useState(false);

    const visit = (next: Partial<Filters> & { page?: number }) => {
        // Only filled-in filters go into the URL, so links stay short and shareable.
        const params = Object.fromEntries(
            Object.entries({ ...filters, page: 1, ...next }).filter(([key, value]) => value !== null && value !== '' && value !== false && !(key === 'page' && value === 1)),
        );
        router.get(route('activity-logs.index'), params, { preserveState: true, preserveScroll: next.page !== undefined && next.page > 1 });
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        visit({ ...draft, page: 1 });
    };

    const reset = () => {
        const empty: Filters = { user: null, wo: null, tailor: null, type: null, from: null, to: null, q: null, auth: false };
        setDraft(empty);
        router.get(route('activity-logs.index'));
    };

    const days = groupByDay(entries);
    const active = Boolean(filters.user || filters.wo || filters.tailor || filters.type || filters.from || filters.to || filters.q || filters.auth);

    return (
        <AppLayout title="Riwayat aktivitas" shortTitle="Riwayat">
            <PageIntro
                hideTextOnPhone
                actions={
                    purge && (
                        <Button variant="outline" onClick={() => setPurgeOpen(true)} className="text-destructive hover:text-destructive">
                            <Trash2 />
                            Hapus riwayat lama
                        </Button>
                    )
                }
            >
                Siapa memasukkan, mengubah, atau menghapus data — di semua menu. Riwayat tidak bisa diubah; hanya Owner yang bisa menghapus riwayat lama.
            </PageIntro>
            {purge && <PurgeHistorySheet open={purgeOpen} onOpenChange={setPurgeOpen} oldest={purge.oldest} />}

            <div className="flex flex-col gap-5">
                <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                            <Input
                                value={draft.q ?? ''}
                                onChange={(event) => setDraft({ ...draft, q: event.target.value })}
                                placeholder="Cari nama orang, artikel, WO, penjahit…"
                                aria-label="Cari riwayat"
                                className="pl-10"
                                inputMode="search"
                                enterKeyHint="search"
                            />
                        </div>
                        <Button type="button" variant={showFilters ? 'secondary' : 'outline'} onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-label="Saring">
                            <SlidersHorizontal />
                            <span className="hidden sm:inline">Saring</span>
                        </Button>
                        <Button type="submit">
                            <Search />
                            <span className="hidden sm:inline">Cari</span>
                        </Button>
                    </div>

                    {showFilters && (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <FormField label="Orang">
                                <NativeSelect value={draft.user ?? ''} onChange={(event) => setDraft({ ...draft, user: event.target.value ? Number(event.target.value) : null })}>
                                    <option value="">Semua orang</option>
                                    {options.users.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </FormField>
                            <FormField label="Penjahit / makloon">
                                <NativeSelect value={draft.tailor ?? ''} onChange={(event) => setDraft({ ...draft, tailor: event.target.value ? Number(event.target.value) : null })}>
                                    <option value="">Semua penjahit</option>
                                    {options.tailors.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </FormField>
                            <FormField label="Jenis data">
                                <NativeSelect value={draft.type ?? ''} onChange={(event) => setDraft({ ...draft, type: event.target.value || null })}>
                                    <option value="">Semua jenis</option>
                                    {options.types.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </FormField>
                            <FormField label="Dari tanggal">
                                <Input type="date" value={draft.from ?? ''} onChange={(event) => setDraft({ ...draft, from: event.target.value || null })} />
                            </FormField>
                            <FormField label="Sampai tanggal">
                                <Input type="date" value={draft.to ?? ''} onChange={(event) => setDraft({ ...draft, to: event.target.value || null })} />
                            </FormField>
                            <label className="flex min-h-11 cursor-pointer items-center gap-2 self-end text-sm font-medium">
                                <input type="checkbox" className="size-4 accent-primary" checked={draft.auth} onChange={(event) => setDraft({ ...draft, auth: event.target.checked })} />
                                Tampilkan juga masuk / keluar aplikasi
                            </label>
                        </div>
                    )}

                    {active && (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            {activeChips(filters, options, workOrderNumber).map((chip) => (
                                <ToneBadge key={chip} tone="primary">
                                    {chip}
                                </ToneBadge>
                            ))}
                            <Button type="button" variant="ghost" size="sm" onClick={reset}>
                                <X />
                                Hapus saringan
                            </Button>
                        </div>
                    )}
                </form>

                {entries.length === 0 ? (
                    <EmptyState className="bg-card py-10 text-base">{active ? 'Tidak ada riwayat yang cocok dengan saringan ini.' : 'Belum ada riwayat aktivitas.'}</EmptyState>
                ) : (
                    days.map(([day, dayEntries]) => (
                        <Section key={day} title={day} icon={History} description={`${dayEntries.length} aktivitas`}>
                            <ol className="flex flex-col divide-y">
                                {dayEntries.map((entry) => (
                                    <EntryRow key={entry.id} entry={entry} />
                                ))}
                            </ol>
                        </Section>
                    ))
                )}

                {(page > 1 || hasMore) && (
                    <div className="flex justify-center gap-2">
                        {page > 1 && (
                            <Button variant="outline" onClick={() => visit({ page: page - 1 })}>
                                Lebih baru
                            </Button>
                        )}
                        {hasMore && (
                            <Button variant="outline" onClick={() => visit({ page: page + 1 })}>
                                Lebih lama
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function EntryRow({ entry }: { entry: Entry }) {
    const [open, setOpen] = useState(false);
    const isAuth = entry.event === 'login' || entry.event === 'logout' || entry.event === 'login_failed';
    const Icon = entry.event === 'login' ? LogIn : entry.event === 'logout' ? LogOut : entry.event === 'login_failed' ? ShieldAlert : null;
    const hasDetails = entry.changes.length > 0;

    return (
        <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    entry.event === 'login_failed' ? 'bg-destructive/10 text-destructive' : entry.user.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
                aria-hidden
            >
                {Icon ? <Icon className="size-4" /> : initials(entry.user.name)}
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="font-semibold">{entry.event === 'login_failed' ? 'Gagal masuk' : entry.user.name}</p>
                    {entry.user.role && <span className="text-xs text-muted-foreground">{entry.user.role}</span>}
                    <time dateTime={entry.at} className="ml-auto text-sm text-muted-foreground tabular">
                        {timeFormatter.format(new Date(entry.at))}
                    </time>
                </div>

                <p className="text-base wrap-anywhere">
                    <span className="font-medium">{entry.action}</span>
                    {entry.subject && !isAuth && <span className="text-muted-foreground"> · {entry.subject.label}</span>}
                    {entry.event === 'login_failed' && entry.email && <span className="text-muted-foreground"> · {entry.email}</span>}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                    {entry.work_order && (
                        <Link href={route('work-orders.show', entry.work_order.id)} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                            <ClipboardList className="size-3.5" />
                            {entry.work_order.number ?? `WO #${entry.work_order.id}`}
                        </Link>
                    )}
                    {entry.tailor?.name && (
                        <Link href={route('activity-logs.index', { tailor: entry.tailor.id })} className="text-sm font-medium text-primary hover:underline">
                            Penjahit {entry.tailor.name}
                        </Link>
                    )}
                    {entry.source !== 'web' && <ToneBadge tone="neutral">{entry.source === 'api' ? 'Dari sistem lain' : 'Otomatis'}</ToneBadge>}
                    {hasDetails && (
                        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                            {entry.change_count} perubahan data
                            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
                        </button>
                    )}
                </div>

                {open && (
                    <ul className="mt-2 flex flex-col gap-2 rounded-md border bg-muted/40 p-3">
                        {entry.changes.map((change) => (
                            <ChangeRow key={change.id} change={change} />
                        ))}
                        {entry.change_count > entry.changes.length && (
                            <li className="text-sm text-muted-foreground">+{entry.change_count - entry.changes.length} perubahan lain</li>
                        )}
                    </ul>
                )}
            </div>
        </li>
    );
}

function ChangeRow({ change }: { change: Change }) {
    const word = CHANGE_WORD[change.event];

    return (
        <li className="text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
                <ToneBadge tone={word.tone} className="px-2 py-0 text-xs">
                    {word.word}
                </ToneBadge>
                <span className="font-medium">{change.type}</span>
                {change.label && <span className="text-muted-foreground wrap-anywhere">· {change.label}</span>}
            </div>
            {change.fields.length > 0 && (
                <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 pl-1">
                    {change.fields.map((field) => (
                        <div key={field.label} className="contents">
                            <dt className="text-muted-foreground">{field.label}</dt>
                            <dd className="wrap-anywhere">
                                {change.event === 'updated' ? (
                                    <>
                                        <span className="text-muted-foreground line-through decoration-1">{show(field.old)}</span>
                                        <span className="px-1 text-muted-foreground">→</span>
                                        <span className="font-medium">{show(field.new)}</span>
                                    </>
                                ) : (
                                    show(change.event === 'created' ? field.new : field.old)
                                )}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
        </li>
    );
}

function show(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(value)) {
        const date = new Date(value.replace(' ', 'T'));
        return value.length === 10
            ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
            : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
    }

    return String(value);
}

function initials(name: string): string {
    return (
        name
            .replace(/[^\p{L}\s]/gu, '')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('') || '?'
    );
}

function activeChips(filters: Filters, options: Props['options'], workOrderNumber: string | null): string[] {
    const find = (list: SelectOption[], value: number | string | null) => list.find((option) => option.value === String(value))?.label;
    const date = (value: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));

    return [
        filters.wo ? `WO ${workOrderNumber ?? `#${filters.wo}`}` : null,
        filters.user ? `Oleh ${find(options.users, filters.user) ?? '#' + filters.user}` : null,
        filters.tailor ? `Penjahit ${find(options.tailors, filters.tailor) ?? '#' + filters.tailor}` : null,
        filters.type ? (find(options.types, filters.type) ?? filters.type) : null,
        filters.from ? `Dari ${date(filters.from)}` : null,
        filters.to ? `Sampai ${date(filters.to)}` : null,
        filters.q ? `“${filters.q}”` : null,
        filters.auth ? 'Termasuk masuk/keluar' : null,
    ].filter((chip): chip is string => chip !== null);
}

function groupByDay(entries: Entry[]): [string, Entry[]][] {
    const groups = new Map<string, Entry[]>();
    for (const entry of entries) {
        const day = dayFormatter.format(new Date(entry.at));
        groups.set(day, [...(groups.get(day) ?? []), entry]);
    }

    return [...groups.entries()];
}
