import { FormField, InputError } from '@/components/form-field';
import { OptionSelect } from '@/components/option-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ManagedUser, SelectOption } from '@/types';
import { useForm } from '@inertiajs/react';
import { Plus, UserCog } from 'lucide-react';
import type { FormEvent } from 'react';

export function UsersCard({ users, userRoles }: { users: ManagedUser[]; userRoles: SelectOption[] }) {
    const form = useForm({ name: '', email: '', role: 'admin', password: '', password_confirmation: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('users.store'), { preserveScroll: true, onSuccess: () => form.reset('name', 'email', 'password', 'password_confirmation') });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <UserCog className="size-4" />
                    Akun Pengguna
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <form className="flex flex-col gap-3" onSubmit={submit}>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FormField label="Nama" htmlFor="user-name" error={form.errors.name}>
                            <Input id="user-name" autoComplete="off" placeholder="Nama admin" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                        </FormField>
                        <FormField label="Email" htmlFor="user-email" error={form.errors.email}>
                            <Input
                                id="user-email"
                                type="email"
                                autoComplete="off"
                                placeholder="admin@email.com"
                                value={form.data.email}
                                onChange={(event) => form.setData('email', event.target.value)}
                            />
                        </FormField>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <FormField label="Role" htmlFor="user-role" error={form.errors.role}>
                            <OptionSelect id="user-role" value={form.data.role} onValueChange={(value) => form.setData('role', value)} options={userRoles} placeholder="Pilih role" />
                        </FormField>
                        <FormField label="Password" htmlFor="user-password" error={form.errors.password}>
                            <Input
                                id="user-password"
                                type="password"
                                autoComplete="new-password"
                                value={form.data.password}
                                onChange={(event) => form.setData('password', event.target.value)}
                            />
                        </FormField>
                        <FormField label="Konfirmasi" htmlFor="user-password-confirmation">
                            <Input
                                id="user-password-confirmation"
                                type="password"
                                autoComplete="new-password"
                                value={form.data.password_confirmation}
                                onChange={(event) => form.setData('password_confirmation', event.target.value)}
                            />
                        </FormField>
                    </div>
                    <Button type="submit" disabled={form.processing}>
                        <Plus />
                        Simpan Akun
                    </Button>
                </form>

                <div className="flex flex-col gap-2">
                    {users.map((user) => (
                        <UserRow key={user.id} user={user} userRoles={userRoles} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function UserRow({ user, userRoles }: { user: ManagedUser; userRoles: SelectOption[] }) {
    const roleForm = useForm({ role: user.role as string });
    const passwordForm = useForm({ password: '', password_confirmation: '' });

    const submitRole = (event: FormEvent) => {
        event.preventDefault();
        roleForm.patch(route('users.role.update', user.id), { preserveScroll: true });
    };

    const submitPassword = (event: FormEvent) => {
        event.preventDefault();
        passwordForm.patch(route('users.password.update', user.id), { preserveScroll: true, onSuccess: () => passwordForm.reset() });
    };

    return (
        <article className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{user.name}</p>
                        {user.is_current_user && <Badge variant="outline">Anda</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="secondary">{user.role_label}</Badge>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <form className="flex flex-col gap-2" onSubmit={submitRole}>
                    <Label className="text-xs text-muted-foreground" htmlFor={`user-role-${user.id}`}>
                        Role
                    </Label>
                    <div className="flex gap-2">
                        <OptionSelect
                            id={`user-role-${user.id}`}
                            value={roleForm.data.role}
                            onValueChange={(value) => roleForm.setData('role', value)}
                            options={userRoles}
                            disabled={user.is_current_user}
                        />
                        <Button size="sm" type="submit" variant="outline" className="h-9" disabled={user.is_current_user || roleForm.processing}>
                            Ubah
                        </Button>
                    </div>
                    <InputError className="text-xs" message={roleForm.errors.role} />
                </form>

                <form className="flex flex-col gap-2" onSubmit={submitPassword}>
                    <Label className="text-xs text-muted-foreground" htmlFor={`user-password-${user.id}`}>
                        Reset password
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <Input
                            id={`user-password-${user.id}`}
                            type="password"
                            autoComplete="new-password"
                            placeholder="Password baru"
                            value={passwordForm.data.password}
                            onChange={(event) => passwordForm.setData('password', event.target.value)}
                        />
                        <Input
                            aria-label="Konfirmasi password baru"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Konfirmasi"
                            value={passwordForm.data.password_confirmation}
                            onChange={(event) => passwordForm.setData('password_confirmation', event.target.value)}
                        />
                        <Button size="sm" type="submit" className="h-9" disabled={passwordForm.processing}>
                            Reset
                        </Button>
                    </div>
                    <InputError className="text-xs" message={passwordForm.errors.password} />
                </form>
            </div>
        </article>
    );
}
