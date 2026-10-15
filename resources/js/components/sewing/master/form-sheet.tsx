import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LoaderCircle, Save, X } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

type FormSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: ReactNode;
    submitLabel?: string;
    processing: boolean;
    onSubmit: () => void;
    children: ReactNode;
};

/** Drawer holding one form. Save and Batal stay pinned at the bottom so they are always in reach. */
export function FormSheet({ open, onOpenChange, title, description, submitLabel = 'Simpan', processing, onSubmit, children }: FormSheetProps) {
    const submit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit();
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" showCloseButton={false} className="w-full gap-0 sm:max-w-lg">
                <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
                    <SheetHeader className="border-b bg-muted/60">
                        <SheetTitle className="font-display text-2xl font-bold uppercase">{title}</SheetTitle>
                        <SheetDescription className="text-base text-muted-foreground">{description}</SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">{children}</div>

                    <SheetFooter className="mt-0 grid grid-cols-[auto_minmax(0,1fr)] border-t bg-card pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            <X />
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? <LoaderCircle className="animate-spin" /> : <Save />}
                            {processing ? 'Menyimpan…' : submitLabel}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
