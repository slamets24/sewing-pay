import { InputError } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Truck } from 'lucide-react';
import type { FormEvent } from 'react';

type ShipmentSubmitBarProps = {
    count: number;
    qty: number;
    notes: string;
    onNotesChange: (notes: string) => void;
    onSubmit: () => void;
    processing: boolean;
    error?: string;
};

/**
 * Sticks to the bottom of the screen while the list scrolls (above the phone's bottom menu),
 * so the send button is always one tap away.
 */
export function ShipmentSubmitBar({ count, qty, notes, onNotesChange, onSubmit, processing, error }: ShipmentSubmitBarProps) {
    const submit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit();
    };

    return (
        <form
            onSubmit={submit}
            className="sticky bottom-[calc(4rem+4px+env(safe-area-inset-bottom))] z-20 flex flex-col gap-3 rounded-lg border-2 border-primary bg-card p-3 shadow-lg lg:bottom-4"
            aria-label="Kirim ke QC"
        >
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <p className="text-lg font-semibold md:min-w-56" aria-live="polite">
                    {count > 0 ? (
                        <>
                            <span className="tabular">{count}</span> setoran · <span className="tabular">{qty}</span> pcs dipilih
                        </>
                    ) : (
                        <span className="text-muted-foreground">Centang setoran yang mau dikirim.</span>
                    )}
                </p>
                {count > 0 && (
                    <Input value={notes} onChange={(event) => onNotesChange(event.target.value)} placeholder="Catatan untuk QC (boleh kosong)" aria-label="Catatan kiriman" maxLength={500} className="md:flex-1" />
                )}
                <Button type="submit" disabled={count === 0 || processing} className="w-full md:w-auto">
                    <Truck aria-hidden />
                    {processing ? 'Mengirim…' : 'Kirim ke QC & cetak label'}
                </Button>
            </div>
            <InputError message={error} />
        </form>
    );
}
