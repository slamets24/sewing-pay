import { FormField, InputError } from '@/components/form-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Tailor } from '@/types';
import { useForm } from '@inertiajs/react';
import { Plus, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';

const emptyTailor = { code: '', name: '', whatsapp_number: '', address: '', joined_at: '', notes: '' };

export function TailorsCard({ tailors }: { tailors: Tailor[] }) {
    const form = useForm(emptyTailor);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('tailors.store'), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <UserPlus className="size-4" />
                    Penjahit
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <form className="flex flex-col gap-3" onSubmit={submit}>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <FormField label="Kode" htmlFor="tailor-code" error={form.errors.code}>
                            <Input id="tailor-code" placeholder="PNJ-001" value={form.data.code} onChange={(event) => form.setData('code', event.target.value)} />
                        </FormField>
                        <FormField label="Nama" htmlFor="tailor-name" error={form.errors.name}>
                            <Input id="tailor-name" placeholder="Nama penjahit" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="WhatsApp" htmlFor="tailor-wa" error={form.errors.whatsapp_number}>
                        <Input
                            id="tailor-wa"
                            placeholder="62812..."
                            value={form.data.whatsapp_number}
                            onChange={(event) => form.setData('whatsapp_number', event.target.value)}
                        />
                    </FormField>
                    <Button type="submit" disabled={form.processing}>
                        <Plus />
                        Simpan Penjahit
                    </Button>
                </form>

                <div className="flex flex-col gap-2">
                    {tailors.map((tailor) => (
                        <TailorRow key={tailor.id} tailor={tailor} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function TailorRow({ tailor }: { tailor: Tailor }) {
    const [editing, setEditing] = useState(false);
    const isActive = tailor.is_active !== false;
    const form = useForm({
        code: tailor.code ?? '',
        name: tailor.name,
        whatsapp_number: tailor.whatsapp_number ?? '',
        address: tailor.address ?? '',
        joined_at: tailor.joined_at ?? '',
        notes: tailor.notes ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(route('tailors.update', tailor.id), { preserveScroll: true, onSuccess: () => setEditing(false) });
    };

    const toggleStatus = () => form.post(route(isActive ? 'tailors.deactivate' : 'tailors.activate', tailor.id), { preserveScroll: true });

    if (editing) {
        return (
            <form className="flex flex-col gap-3 rounded-lg border p-3" onSubmit={submit}>
                <div className="grid gap-2 sm:grid-cols-2">
                    <Input aria-label="Kode penjahit" value={form.data.code} onChange={(event) => form.setData('code', event.target.value)} />
                    <Input aria-label="Nama penjahit" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                    <Input
                        aria-label="WhatsApp penjahit"
                        value={form.data.whatsapp_number}
                        onChange={(event) => form.setData('whatsapp_number', event.target.value)}
                    />
                    <Input aria-label="Tanggal masuk" type="date" value={form.data.joined_at} onChange={(event) => form.setData('joined_at', event.target.value)} />
                </div>
                <Textarea aria-label="Catatan penjahit" rows={2} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
                <InputError message={form.errors.code ?? form.errors.name} />
                <div className="flex gap-2">
                    <Button size="sm" type="submit" disabled={form.processing}>
                        Simpan
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => setEditing(false)}>
                        Batal
                    </Button>
                </div>
            </form>
        );
    }

    return (
        <article className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{tailor.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                        {tailor.code} / {tailor.whatsapp_number || 'Tanpa WA'}
                    </p>
                </div>
                <Badge variant={isActive ? 'secondary' : 'outline'}>{isActive ? 'Aktif' : 'Nonaktif'}</Badge>
            </div>
            <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    Edit
                </Button>
                <Button size="sm" variant="outline" disabled={form.processing} onClick={toggleStatus}>
                    {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
            </div>
        </article>
    );
}
