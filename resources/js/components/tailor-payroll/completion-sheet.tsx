import { ConfirmButton } from '@/components/confirm-button';
import { FormField, InputError } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { formatIdr } from '@/lib/format';
import type { ActiveAssignment } from '@/models/active-assignment';
import { operationalService } from '@/services/operational-service';
import { useForm } from '@inertiajs/react';
import { ClipboardCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import { QtyStepper } from './qty-stepper';

type CompletionSheetProps = {
    assignment: ActiveAssignment | null;
    onClose: () => void;
};

/** Bottom sheet for the less common cases: an exact qty, a back-dated time, a note, or cancelling the pickup. */
export function CompletionSheet({ assignment, onClose }: CompletionSheetProps) {
    return (
        <Sheet open={assignment !== null} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" className="mx-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl">
                {assignment && <CompletionSheetBody key={assignment.id} assignment={assignment} onDone={onClose} />}
            </SheetContent>
        </Sheet>
    );
}

function CompletionSheetBody({ assignment, onDone }: { assignment: ActiveAssignment; onDone: () => void }) {
    const form = useForm({ completed_qty: 0, completed_at: '', notes: '' });
    const idPrefix = `completion-${assignment.id}`;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('assignments.completions.store', assignment.id), { preserveScroll: true, onSuccess: onDone });
    };

    const errors = form.errors as Partial<Record<string, string>>;

    return (
        <>
            <SheetHeader className="pb-0">
                <SheetTitle>{assignment.tailorName}</SheetTitle>
                <SheetDescription>
                    {assignment.title} · {assignment.meta} · sisa {assignment.remainingQty} pcs
                </SheetDescription>
            </SheetHeader>

            <form className="flex flex-col gap-4 px-4 pb-6" onSubmit={submit}>
                <FormField label="Qty selesai" htmlFor={`${idPrefix}-qty`} error={form.errors.completed_qty}>
                    <QtyStepper
                        id={`${idPrefix}-qty`}
                        value={form.data.completed_qty}
                        max={assignment.remainingQty}
                        presets={[1, 5, 10]}
                        maxLabel="Sisa"
                        onChange={(qty) => form.setData('completed_qty', qty)}
                    />
                </FormField>
                <FormField label="Waktu selesai (kosongkan untuk sekarang)" htmlFor={`${idPrefix}-date`} error={form.errors.completed_at}>
                    <Input
                        id={`${idPrefix}-date`}
                        type="datetime-local"
                        value={form.data.completed_at}
                        onChange={(event) => form.setData('completed_at', event.target.value)}
                    />
                </FormField>
                <FormField label="Catatan" htmlFor={`${idPrefix}-notes`} error={form.errors.notes}>
                    <Textarea
                        id={`${idPrefix}-notes`}
                        rows={2}
                        placeholder="Catatan revisi/cacat jika ada"
                        value={form.data.notes}
                        onChange={(event) => form.setData('notes', event.target.value)}
                    />
                </FormField>
                <InputError message={errors.tailor_assignment_id} />
                <Button type="submit" size="lg" className="h-auto py-2.5 whitespace-normal" disabled={form.processing || form.data.completed_qty < 1}>
                    <ClipboardCheck />
                    {form.data.completed_qty > 0
                        ? `Simpan ${form.data.completed_qty} pcs · ${formatIdr(assignment.wageFor(form.data.completed_qty))}`
                        : 'Isi qty selesai'}
                </Button>

                {assignment.canCancel && (
                    <div className="flex flex-col gap-2 border-t pt-4">
                        <p className="text-sm text-muted-foreground">Salah catat pengambilan? Batalkan, qty-nya kembali ke stok hancaan.</p>
                        <ConfirmButton
                            variant="ghost"
                            className="self-start"
                            idleClassName="text-destructive"
                            confirmLabel="Ya, batalkan pengambilan"
                            onConfirm={() => operationalService.cancelAssignment(assignment.id, { onSuccess: onDone })}
                        >
                            Batalkan pengambilan
                        </ConfirmButton>
                    </div>
                )}
            </form>
        </>
    );
}
