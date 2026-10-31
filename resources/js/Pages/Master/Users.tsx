import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { ChoiceButtons } from '@/components/sewing/master/choice-buttons';
import { FormSheet } from '@/components/sewing/master/form-sheet';
import { PasswordField } from '@/components/sewing/master/password-field';
import { PageIntro, Section } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ManagedUserForm, RoleCatalog, type NewUserFormData, type PasswordFormData, type RoleFormData, type RoleOption } from '@/domain/master/managed-user-form';
import { SheetState } from '@/domain/master/sheet-state';
import AppLayout from '@/layouts/app-layout';
import type { SelectOption, UserRole } from '@/types';
import type { ManagedUserRecord } from '@/types/sewing';
import { useForm } from '@inertiajs/react';
import { KeyRound, ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

type UsersProps = {
    users: ManagedUserRecord[];
    roles: SelectOption[];
};

/** null target = "Tambah akun"; otherwise one of the per-user drawers. */
type UserAction = { kind: 'role' | 'password'; user: ManagedUserRecord };

export default function Users({ users, roles }: UsersProps) {
    const roleOptions = useMemo(() => new RoleCatalog(roles).options(), [roles]);
    const [sheet, setSheet] = useState(() => SheetState.closed<UserAction>());

    const openFor = (action: UserAction | null) => setSheet((current) => current.openFor(action));
    const onOpenChange = (open: boolean) => setSheet((current) => current.withOpen(open));

    return (
        <AppLayout title="Pengguna">
            <PageIntro
                actions={
                    <Button onClick={() => openFor(null)}>
                        <UserPlus />
                        Tambah akun
                    </Button>
                }
            />

            <Section title="Daftar akun" icon={ShieldCheck} description={`${users.length} akun`}>
                {users.length === 0 ? (
                    <EmptyState className="text-base">Belum ada akun.</EmptyState>
                ) : (
                    <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 lg:gap-0 lg:divide-y lg:overflow-hidden lg:rounded-lg lg:border">
                        {users.map((user) => (
                            <UserRow key={user.id} user={user} onAction={(kind) => openFor({ kind, user })} />
                        ))}
                    </ul>
                )}
            </Section>

            <UserSheet key={sheet.session} state={sheet} roleOptions={roleOptions} onOpenChange={onOpenChange} />
        </AppLayout>
    );
}

function UserRow({ user, onAction }: { user: ManagedUserRecord; onAction: (kind: UserAction['kind']) => void }) {
    return (
        <li className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-center lg:gap-4 lg:rounded-none lg:border-0 lg:px-4 lg:py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="min-w-0">
                    <p className="text-lg leading-tight font-bold wrap-anywhere">{user.name}</p>
                    <p className="text-base text-muted-foreground wrap-anywhere">{user.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ToneBadge tone={RoleCatalog.tone(user.role)}>{user.role_label}</ToneBadge>
                    {user.is_current_user && <ToneBadge tone="neutral">Akun Anda</ToneBadge>}
                </div>
            </div>

            {user.is_current_user ? (
                <p className="text-sm text-muted-foreground lg:max-w-56 lg:text-right">Peran dan password akun sendiri tidak diubah dari sini.</p>
            ) : (
                <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:flex lg:shrink-0">
                    <Button variant="outline" onClick={() => onAction('role')} aria-label={`Ubah peran ${user.name}`}>
                        <UserCog />
                        Ubah peran
                    </Button>
                    <Button variant="outline" onClick={() => onAction('password')} aria-label={`Reset password ${user.name}`}>
                        <KeyRound />
                        Reset password
                    </Button>
                </div>
            )}
        </li>
    );
}

type UserSheetProps = {
    state: SheetState<UserAction>;
    roleOptions: RoleOption[];
    onOpenChange: (open: boolean) => void;
};

/** Picks the drawer for the current action. Keyed by session in the parent, so each opening starts with a fresh form. */
function UserSheet({ state, roleOptions, onOpenChange }: UserSheetProps) {
    const action = state.target;

    if (action === null) {
        return <CreateUserSheet open={state.open} onOpenChange={onOpenChange} roleOptions={roleOptions} />;
    }

    if (action.kind === 'role') {
        return <RoleSheet open={state.open} onOpenChange={onOpenChange} user={action.user} roleOptions={roleOptions} />;
    }

    return <PasswordSheet open={state.open} onOpenChange={onOpenChange} user={action.user} />;
}

type SheetProps = { open: boolean; onOpenChange: (open: boolean) => void };

function CreateUserSheet({ open, onOpenChange, roleOptions }: SheetProps & { roleOptions: RoleOption[] }) {
    const form = useForm<NewUserFormData>(ManagedUserForm.blank());
    form.transform(ManagedUserForm.createPayload);

    const submit = () => form.post(route('users.store'), { preserveScroll: true, onSuccess: () => onOpenChange(false) });

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Tambah akun"
            submitLabel="Buat akun"
            processing={form.processing}
            onSubmit={submit}
        >
            <FormField label="Nama" htmlFor="user-name" error={form.errors.name}>
                <Input
                    id="user-name"
                    value={form.data.name}
                    onChange={(event) => form.setData('name', event.target.value)}
                    aria-invalid={!!form.errors.name || undefined}
                    autoComplete="off"
                />
            </FormField>

            <FormField label="Email (untuk masuk)" htmlFor="user-email" error={form.errors.email}>
                <Input
                    id="user-email"
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoComplete="off"
                    value={form.data.email}
                    onChange={(event) => form.setData('email', event.target.value)}
                    aria-invalid={!!form.errors.email || undefined}
                />
            </FormField>

            <div className="grid gap-4">
                <FormField label="Password" htmlFor="user-password" error={form.errors.password}>
                    <PasswordField id="user-password" value={form.data.password} onChange={(value) => form.setData('password', value)} invalid={!!form.errors.password} />
                </FormField>
                <FormField label="Ulangi password" htmlFor="user-password-confirm" error={form.errors.password_confirmation}>
                    <PasswordField
                        id="user-password-confirm"
                        value={form.data.password_confirmation}
                        onChange={(value) => form.setData('password_confirmation', value)}
                        invalid={!!form.errors.password_confirmation}
                    />
                </FormField>
            </div>
            <p className="-mt-3 text-sm text-muted-foreground">Minimal 8 karakter.</p>

            <RoleFields role={form.data.role} roleOptions={roleOptions} roleError={form.errors.role} onRoleChange={(role) => form.setData('role', role)} />
        </FormSheet>
    );
}

function RoleSheet({ open, onOpenChange, user, roleOptions }: SheetProps & { user: ManagedUserRecord; roleOptions: RoleOption[] }) {
    const form = useForm<RoleFormData>(ManagedUserForm.roleForm(user));
    form.transform(ManagedUserForm.rolePayload);

    const submit = () => form.patch(route('users.update', user.id), { preserveScroll: true, onSuccess: () => onOpenChange(false) });

    return (
        <FormSheet open={open} onOpenChange={onOpenChange} title="Ubah peran" description={`${user.name} · ${user.email}`} processing={form.processing} onSubmit={submit}>
            <RoleFields role={form.data.role} roleOptions={roleOptions} roleError={form.errors.role} onRoleChange={(role) => form.setData('role', role)} />
        </FormSheet>
    );
}

function PasswordSheet({ open, onOpenChange, user }: SheetProps & { user: ManagedUserRecord }) {
    const form = useForm<PasswordFormData>(ManagedUserForm.blankPassword());

    const submit = () =>
        form.patch(route('users.password.update', user.id), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
            onError: () => form.reset('password', 'password_confirmation'),
        });

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Reset password"
            description={user.name}
            submitLabel="Simpan password"
            processing={form.processing}
            onSubmit={submit}
        >
            <FormField label="Password baru" htmlFor="reset-password" error={form.errors.password}>
                <PasswordField id="reset-password" value={form.data.password} onChange={(value) => form.setData('password', value)} invalid={!!form.errors.password} />
            </FormField>
            <FormField label="Ulangi password baru" htmlFor="reset-password-confirm" error={form.errors.password_confirmation}>
                <PasswordField
                    id="reset-password-confirm"
                    value={form.data.password_confirmation}
                    onChange={(value) => form.setData('password_confirmation', value)}
                    invalid={!!form.errors.password_confirmation}
                />
            </FormField>
            <p className="text-sm text-muted-foreground">Minimal 8 karakter. Beri tahu pemilik akun password barunya.</p>
        </FormSheet>
    );
}

function RoleFields({ role, roleOptions, roleError, onRoleChange }: { role: UserRole; roleOptions: RoleOption[]; roleError?: string; onRoleChange: (role: UserRole) => void }) {
    return (
        <FormField label="Peran" error={roleError}>
            <ChoiceButtons label="Peran" value={role} options={roleOptions} onChange={onRoleChange} className="sm:grid-cols-1" />
        </FormField>
    );
}
