import { FormField } from '@/components/form-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate, todayIso } from '@/lib/format';
import type { PayoutSummary } from '@/types/sewing';
import { Link, useForm } from '@inertiajs/react';
import { ArrowRight, CalendarCheck, TriangleAlert } from 'lucide-react';
import type { FormEvent } from 'react';

/** Picks the cut-off date for a new pay run. Locked while another draft is still open. */
export function CreatePayoutForm({ hasDraft, draft }: { hasDraft: boolean; draft: PayoutSummary | null }) {
    const form = useForm({ cutoff_date: todayIso(), notes: '' });
    const locked = hasDraft;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (locked) return;

        form.post(route('payouts.store'), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            {locked && (
                <Alert className="border-primary/70 bg-primary/15 text-base">
                    <TriangleAlert />
                    <AlertTitle className="line-clamp-none text-base font-bold">Masih ada draft. Selesaikan atau hapus dulu.</AlertTitle>
                    {draft && (
                        <AlertDescription className="text-base text-foreground">
                            <p>
                                Draft <span className="font-semibold">{draft.code}</span> (s.d. {formatDate(draft.cutoff_date)}) belum selesai dibayar.
                            </p>
                            <Button asChild variant="outline" className="mt-2">
                                <Link href={route('payouts.show', draft.id)}>
                                    <ArrowRight />
                                    Buka draft {draft.code}
                                </Link>
                            </Button>
                        </AlertDescription>
                    )}
                </Alert>
            )}

            <fieldset disabled={locked || form.processing} className="grid gap-4 disabled:opacity-60 md:grid-cols-[14rem_minmax(0,1fr)]">
                <FormField label="Tanggal batas" htmlFor="cutoff_date" error={form.errors.cutoff_date}>
                    <Input
                        id="cutoff_date"
                        type="date"
                        required
                        value={form.data.cutoff_date}
                        onChange={(event) => form.setData('cutoff_date', event.target.value)}
                        aria-invalid={Boolean(form.errors.cutoff_date)}
                    />
                </FormField>
                <FormField label="Catatan" htmlFor="payout_notes" error={form.errors.notes}>
                    <Input
                        id="payout_notes"
                        value={form.data.notes}
                        maxLength={500}
                        placeholder="Misal: gajian minggu pertama Oktober"
                        onChange={(event) => form.setData('notes', event.target.value)}
                    />
                </FormField>
            </fieldset>

            <div>
                <Button type="submit" size="lg" disabled={locked || form.processing}>
                    <CalendarCheck />
                    {form.processing ? 'Membuat…' : 'Buat pencairan'}
                </Button>
            </div>
        </form>
    );
}
