import { FormField } from '@/components/form-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GuestLayout from '@/layouts/guest-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { LogIn } from 'lucide-react';
import type { FormEvent } from 'react';

type LoginProps = {
    canResetPassword: boolean;
    status?: string | null;
};

export default function Login({ canResetPassword, status }: LoginProps) {
    const form = useForm({ email: '', password: '', remember: false });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('login'), { onFinish: () => form.reset('password') });
    };

    return (
        <GuestLayout title="Masuk" description="Pakai email dan password yang diberikan owner.">
            <Head title="Masuk" />

            {status && (
                <Alert className="mb-4">
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

            <form className="flex flex-col gap-4" onSubmit={submit}>
                <FormField label="Email" htmlFor="email" error={form.errors.email}>
                    <Input
                        id="email"
                        type="email"
                        autoComplete="username"
                        autoFocus
                        required
                        value={form.data.email}
                        onChange={(event) => form.setData('email', event.target.value)}
                    />
                </FormField>

                <FormField label="Password" htmlFor="password" error={form.errors.password}>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={form.data.password}
                        onChange={(event) => form.setData('password', event.target.value)}
                    />
                </FormField>

                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="remember"
                            checked={form.data.remember}
                            onCheckedChange={(checked) => form.setData('remember', checked === true)}
                        />
                        <Label htmlFor="remember" className="font-normal">
                            Ingat saya
                        </Label>
                    </div>
                    {canResetPassword && (
                        <Link href={route('password.request')} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                            Lupa password?
                        </Link>
                    )}
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={form.processing}>
                    <LogIn />
                    Masuk
                </Button>
            </form>
        </GuestLayout>
    );
}
