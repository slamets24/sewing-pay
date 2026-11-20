import { ConfirmButton } from '@/components/confirm-button';
import { EmptyState } from '@/components/empty-state';
import { FormField, InputError } from '@/components/form-field';
import { ChoiceButtons } from '@/components/sewing/master/choice-buttons';
import { FormSheet } from '@/components/sewing/master/form-sheet';
import { PageIntro, Section } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    AbilitySelection,
    RoleForm,
    type AbilityAuditReport,
    type AbilityGroup,
    type RoleFormData,
    type RoleRecord,
} from '@/domain/master/role-form';
import { SheetState } from '@/domain/master/sheet-state';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { router, useForm, usePage } from '@inertiajs/react';
import { CircleCheck, KeyRound, Lock, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

type RolesProps = {
    roles: RoleRecord[];
    abilityGroups: AbilityGroup[];
    audit: AbilityAuditReport;
};

export default function Roles({ roles, abilityGroups, audit }: RolesProps) {
    const [sheet, setSheet] = useState(() => SheetState.closed<RoleRecord>());
    const selection = useMemo(() => new AbilitySelection(abilityGroups), [abilityGroups]);
    const assignableCount = selection.assignable().length;
    const roleError = (usePage().props.errors as Record<string, string | undefined>).role;

    const openFor = (role: RoleRecord | null) => setSheet((current) => current.openFor(role));

    return (
        <AppLayout title="Role & akses" shortTitle="Role">
            <PageIntro
                actions={
                    <Button onClick={() => openFor(null)}>
                        <Plus />
                        Tambah role
                    </Button>
                }
            >
                Setiap role punya daftar ability (hak akses). Menu dan tombol mengikuti ability role akun. Owner selalu punya semua akses.
            </PageIntro>

            <div className="flex flex-col gap-5">
                <AuditPanel audit={audit} />

                {roleError && (
                    <Alert variant="destructive">
                        <ShieldAlert />
                        <AlertTitle>Role tidak bisa dihapus</AlertTitle>
                        <AlertDescription>{roleError}</AlertDescription>
                    </Alert>
                )}

                <Section title="Daftar role" icon={KeyRound} description={`${roles.length} role · ${assignableCount} ability bisa diatur`}>
                    {roles.length === 0 ? (
                        <EmptyState className="text-base">Belum ada role.</EmptyState>
                    ) : (
                        <ul className="grid gap-3 md:grid-cols-2">
                            {roles.map((role) => (
                                <RoleCard key={role.id} role={role} selection={selection} total={assignableCount} onEdit={() => openFor(role)} />
                            ))}
                        </ul>
                    )}
                </Section>
            </div>

            <RoleSheet
                key={sheet.session}
                state={sheet}
                groups={abilityGroups}
                selection={selection}
                onOpenChange={(open) => setSheet((current) => current.withOpen(open))}
            />
        </AppLayout>
    );
}

/** Result of `php artisan abilities:audit`: routes without an ability, unknown or unused abilities. */
function AuditPanel({ audit }: { audit: AbilityAuditReport }) {
    const issues = RoleForm.auditIssueCount(audit);

    if (issues === 0) {
        return (
            <Alert className="border-stage-done/40 bg-stage-done/8">
                <CircleCheck className="text-stage-done" />
                <AlertTitle>Semua halaman sudah punya ability</AlertTitle>
                <AlertDescription>
                    {audit.route_count} route staff dijaga oleh {audit.ability_count} ability. Tidak ada ability yang belum dibuat atau tidak terpakai.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Alert className="border-stage-revision/40 bg-stage-revision/8">
            <ShieldAlert className="text-stage-revision" />
            <AlertTitle>{issues} temuan pada pengecekan ability</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
                {audit.unguarded_routes.length > 0 && (
                    <AuditList title="Route belum punya ability (semua role yang bisa login dapat membukanya):" items={audit.unguarded_routes.map((row) => `${row.methods} ${row.uri} (${row.name || 'tanpa nama'})`)} />
                )}
                {audit.undefined_abilities.length > 0 && (
                    <AuditList title="Ability dipakai route tapi belum didaftarkan:" items={audit.undefined_abilities.map((row) => `${row.ability} — ${row.methods} ${row.uri}`)} />
                )}
                {audit.unused_abilities.length > 0 && <AuditList title="Ability terdaftar tapi tidak dipakai route mana pun:" items={audit.unused_abilities} />}
                {audit.stale_role_abilities.length > 0 && (
                    <AuditList
                        title="Role menyimpan ability yang sudah tidak ada (hilang saat role disimpan ulang):"
                        items={audit.stale_role_abilities.map((row) => `${row.role}: ${row.abilities.join(', ')}`)}
                    />
                )}
            </AlertDescription>
        </Alert>
    );
}

function AuditList({ title, items }: { title: string; items: string[] }) {
    return (
        <div>
            <p className="font-semibold">{title}</p>
            <ul className="ml-4 list-disc font-mono text-sm">
                {items.map((item) => (
                    <li key={item} className="wrap-anywhere">
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function RoleCard({ role, selection, total, onEdit }: { role: RoleRecord; selection: AbilitySelection; total: number; onEdit: () => void }) {
    const destroy = () => router.delete(route('roles.destroy', role.id), { preserveScroll: true });
    const preview = role.abilities.slice(0, 6);

    return (
        <li className={cn('flex min-w-0 flex-col gap-3 rounded-lg border p-4', role.can_login ? 'bg-card' : 'border-dashed bg-muted/70')}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-lg leading-tight font-bold wrap-anywhere">{role.name}</p>
                    {role.description && <p className="text-sm text-muted-foreground wrap-anywhere">{role.description}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <ToneBadge tone={role.is_system ? 'primary' : 'other'}>{role.is_system ? 'Bawaan' : 'Kustom'}</ToneBadge>
                    {!role.can_login && <ToneBadge tone="neutral">Tidak bisa login</ToneBadge>}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    <Users className="size-4" aria-hidden />
                    {role.users_count} akun
                </span>
                <span className="flex items-center gap-1.5">
                    <ShieldCheck className="size-4" aria-hidden />
                    {role.is_owner ? 'Semua akses' : role.can_login ? `${role.abilities.length} dari ${total} ability` : 'Tanpa akses aplikasi'}
                </span>
            </div>

            {!role.is_owner && role.can_login && (
                <p className="text-sm wrap-anywhere">
                    {preview.length === 0 ? (
                        <span className="text-muted-foreground">Belum ada ability — akun dengan role ini belum bisa masuk.</span>
                    ) : (
                        <>
                            {preview.map((ability) => selection.label(ability)).join(' · ')}
                            {role.abilities.length > preview.length && <span className="text-muted-foreground"> · +{role.abilities.length - preview.length} lagi</span>}
                        </>
                    )}
                </p>
            )}

            {role.unknown_abilities.length > 0 && (
                <p className="text-sm text-stage-revision">Ability usang tersimpan: {role.unknown_abilities.join(', ')}</p>
            )}

            <div className="mt-auto flex flex-wrap gap-2">
                {role.is_locked ? (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Lock className="size-4" aria-hidden />
                        {role.is_owner ? 'Owner selalu punya semua akses.' : 'Dikunci sistem: role ini tidak bisa masuk aplikasi.'}
                    </p>
                ) : (
                    <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
                        <Pencil />
                        Atur ability
                    </Button>
                )}
                {role.is_deletable && (
                    <ConfirmButton size="sm" confirmLabel="Yakin hapus?" onConfirm={destroy} disabled={role.users_count > 0} title={role.users_count > 0 ? 'Masih dipakai akun' : undefined}>
                        <Trash2 />
                        Hapus
                    </ConfirmButton>
                )}
            </div>
        </li>
    );
}

type RoleSheetProps = {
    state: SheetState<RoleRecord>;
    groups: AbilityGroup[];
    selection: AbilitySelection;
    onOpenChange: (open: boolean) => void;
};

/** Add a role, or change the name and abilities of one. Keyed by session in the parent so each opening starts fresh. */
function RoleSheet({ state, groups, selection, onOpenChange }: RoleSheetProps) {
    const role = state.target;
    const form = useForm<RoleFormData>(role ? RoleForm.fromRecord(role) : RoleForm.blank());
    form.transform((data) => RoleForm.payload(data, role));

    const submit = () => {
        const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) };

        if (role) {
            form.patch(route('roles.update', role.id), options);
        } else {
            form.post(route('roles.store'), options);
        }
    };

    const errors = form.errors as Record<string, string | undefined>;
    const abilityError = errors.abilities ?? Object.entries(errors).find(([key]) => key.startsWith('abilities.'))?.[1];

    return (
        <FormSheet
            open={state.open}
            onOpenChange={onOpenChange}
            title={role ? 'Atur role' : 'Tambah role'}
            description={role ? `${role.name} · ${role.users_count} akun` : 'Beri nama, lalu centang ability yang boleh dipakai role ini.'}
            submitLabel={role ? 'Simpan role' : 'Buat role'}
            processing={form.processing}
            onSubmit={submit}
        >
            <FormField label="Nama role" htmlFor="role-name" error={form.errors.name}>
                <Input id="role-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} aria-invalid={!!form.errors.name || undefined} autoComplete="off" placeholder="Contoh: Kepala Gudang" />
            </FormField>

            <FormField label="Keterangan (opsional)" htmlFor="role-description" error={form.errors.description}>
                <Textarea id="role-description" rows={2} className="text-base md:text-base" value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} />
            </FormField>

            {!role?.is_system && (
                <FormField label="Akses login" error={form.errors.can_login}>
                    <ChoiceButtons
                        label="Akses login"
                        value={form.data.can_login ? 'yes' : 'no'}
                        onChange={(value) => form.setData('can_login', value === 'yes')}
                        options={[
                            { value: 'yes', label: 'Bisa login', description: 'Akun dengan role ini masuk pakai email.' },
                            { value: 'no', label: 'Tidak bisa login', description: 'Hanya label, tanpa akses aplikasi.' },
                        ]}
                    />
                </FormField>
            )}

            <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">Ability</p>
                    <p className="text-sm text-muted-foreground">{form.data.abilities.length} dipilih</p>
                </div>
                {!form.data.can_login && <p className="text-sm text-muted-foreground">Ability tersimpan, tapi baru berlaku kalau role bisa login.</p>}
                <InputError message={abilityError} />

                <div className="flex flex-col gap-4">
                    {groups.map((group) => (
                        <AbilityGroupFields
                            key={group.label}
                            group={group}
                            selection={selection}
                            selected={form.data.abilities}
                            onChange={(abilities) => form.setData('abilities', abilities)}
                        />
                    ))}
                </div>
            </div>
        </FormSheet>
    );
}

type AbilityGroupFieldsProps = {
    group: AbilityGroup;
    selection: AbilitySelection;
    selected: RoleFormData['abilities'];
    onChange: (abilities: RoleFormData['abilities']) => void;
};

function AbilityGroupFields({ group, selection, selected, onChange }: AbilityGroupFieldsProps) {
    const groupId = `group-${group.label.replace(/\W+/g, '-').toLowerCase()}`;
    const state = selection.groupState(selected, group);

    return (
        <fieldset className="overflow-hidden rounded-lg border">
            <legend className="sr-only">{group.label}</legend>
            <label htmlFor={groupId} className="flex cursor-pointer items-center gap-3 border-b bg-muted/60 px-3 py-2">
                <Checkbox id={groupId} checked={state} onCheckedChange={(checked) => onChange(selection.setGroup(selected, group, checked === true))} />
                <span className="flex-1 text-sm font-bold tracking-wide uppercase">{group.label}</span>
                <span className="text-xs text-muted-foreground">Pilih semua</span>
            </label>

            <ul className="divide-y">
                {group.abilities.map((ability) => {
                    const id = `ability-${ability.value}`;
                    const checked = selected.includes(ability.value);
                    const neededBy = checked ? selection.requiredBy(ability.value, selected) : [];

                    return (
                        <li key={ability.value}>
                            <label htmlFor={id} className={cn('flex items-start gap-3 px-3 py-2.5', ability.owner_only ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-accent/60')}>
                                <Checkbox
                                    id={id}
                                    className="mt-0.5"
                                    checked={ability.owner_only ? false : checked}
                                    disabled={ability.owner_only}
                                    onCheckedChange={(next) => onChange(selection.toggle(selected, ability.value, next === true))}
                                />
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="flex flex-wrap items-center gap-2 text-base font-semibold">
                                        {ability.label}
                                        {ability.owner_only && <ToneBadge tone="neutral">Khusus Owner</ToneBadge>}
                                        {ability.sensitive && !ability.owner_only && <ToneBadge tone="revision">Sensitif</ToneBadge>}
                                    </span>
                                    <span className="text-sm text-muted-foreground">{ability.description}</span>
                                    {ability.requires && !ability.owner_only && <span className="text-xs text-muted-foreground">Otomatis ikut: {selection.label(ability.requires)}</span>}
                                    {neededBy.length > 0 && (
                                        <span className="text-xs text-muted-foreground">Melepas ini juga melepas: {neededBy.map((info) => info.label).join(', ')}</span>
                                    )}
                                    <code className="text-[11px] text-muted-foreground/80">{ability.value}</code>
                                </span>
                            </label>
                        </li>
                    );
                })}
            </ul>
        </fieldset>
    );
}
