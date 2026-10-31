import { FormField } from '@/components/form-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GuestLayout from '@/layouts/guest-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import type { FormEvent } from 'react';

export default function ForgotPassword({ status }: { status?: string | null }) {
    const form = useForm({ email: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('password.email'));
    };

    return (
        <GuestLayout title="Lupa password">
            <Head title="Lupa Password" />

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

                <Button type="submit" className="w-full" disabled={form.processing}>
                    <Mail />
                    Kirim link reset
                </Button>

                <Link href={route('login')} className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
                    Kembali ke halaman masuk
                </Link>
            </form>
        </GuestLayout>
    );
}
