import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GuestLayout from '@/layouts/guest-layout';
import { Head, useForm } from '@inertiajs/react';
import { LockKeyhole } from 'lucide-react';
import type { FormEvent } from 'react';

type PinProps = {
    tailor: { name: string; code: string | null };
    action: string;
    must_change: boolean;
};

export default function PortalPin({ tailor, action, must_change }: PinProps) {
    const form = useForm({ pin: '', new_pin: '', new_pin_confirmation: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(action, { onFinish: () => form.reset('pin', 'new_pin', 'new_pin_confirmation') });
    };

    return (
        <GuestLayout
            title={must_change ? 'Ganti PIN' : 'PIN portal'}
            description={must_change ? `${tailor.name} masih memakai PIN awal. Buat PIN baru sebelum membuka portal.` : `Masukkan PIN 6 angka untuk ${tailor.name}.`}
        >
            <Head title={must_change ? 'Ganti PIN' : 'PIN portal'} />

            <form className="flex flex-col gap-4" onSubmit={submit}>
                <FormField label={must_change ? 'PIN awal' : 'PIN'} htmlFor="portal-pin" error={form.errors.pin}>
                    <Input
                        id="portal-pin"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        pattern="[0-9]*"
                        value={form.data.pin}
                        onChange={(event) => form.setData('pin', event.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center text-2xl tracking-[0.4em]"
                        autoFocus
                        required
                    />
                </FormField>

                {must_change && (
                    <>
                        <FormField label="PIN baru" htmlFor="portal-new-pin" error={form.errors.new_pin}>
                            <Input
                                id="portal-new-pin"
                                inputMode="numeric"
                                autoComplete="new-password"
                                maxLength={6}
                                value={form.data.new_pin}
                                onChange={(event) => form.setData('new_pin', event.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="text-center text-2xl tracking-[0.4em]"
                                required
                            />
                        </FormField>
                        <FormField label="Ulangi PIN baru" htmlFor="portal-new-pin-confirm" error={form.errors.new_pin_confirmation}>
                            <Input
                                id="portal-new-pin-confirm"
                                inputMode="numeric"
                                autoComplete="new-password"
                                maxLength={6}
                                value={form.data.new_pin_confirmation}
                                onChange={(event) => form.setData('new_pin_confirmation', event.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="text-center text-2xl tracking-[0.4em]"
                                required
                            />
                        </FormField>
                        <p className="text-sm text-muted-foreground">6 angka, dan jangan memakai 123456.</p>
                    </>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={form.processing}>
                    <LockKeyhole />
                    {must_change ? 'Simpan PIN' : 'Buka portal'}
                </Button>
                {!must_change && <p className="text-center text-sm text-muted-foreground">Lupa PIN? Minta owner mereset dari menu Penjahit.</p>}
            </form>
        </GuestLayout>
    );
}
