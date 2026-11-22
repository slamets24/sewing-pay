import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LoaderCircle, Save, Trash2, X } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

type FormSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: ReactNode;
    submitLabel?: string;
    processing: boolean;
    /** Submit off without the "Menyimpan…" label (e.g. confirmation not typed yet). */
    disabled?: boolean;
    /** Red submit with a trash icon for irreversible actions. */
    destructive?: boolean;
    onSubmit: () => void;
    children: ReactNode;
};

/** Drawer holding one form. Save and Batal stay pinned at the bottom so they are always in reach. */
export function FormSheet({ open, onOpenChange, title, description, submitLabel = 'Simpan', processing, disabled = false, destructive = false, onSubmit, children }: FormSheetProps) {
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!disabled) onSubmit();
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" showCloseButton={false} className="w-full gap-0 sm:max-w-lg">
                <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
                    <SheetHeader className="border-b bg-muted/60">
                        <SheetTitle>{title}</SheetTitle>
                        {description && <SheetDescription>{description}</SheetDescription>}
                    </SheetHeader>

                    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">{children}</div>

                    <SheetFooter className="mt-0 grid grid-cols-[auto_minmax(0,1fr)] border-t bg-card pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            <X />
                            Batal
                        </Button>
                        <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={processing || disabled}>
                            {processing ? <LoaderCircle className="animate-spin" /> : destructive ? <Trash2 /> : <Save />}
                            {processing ? 'Menyimpan…' : submitLabel}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
