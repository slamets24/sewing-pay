import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FieldContext } from '@/lib/field-context';
import { useId, type ReactNode } from 'react';

type FormFieldProps = {
    label: string;
    htmlFor?: string;
    error?: string;
    className?: string;
    children: ReactNode;
};

export function FormField({ label, htmlFor, error, className, children }: FormFieldProps) {
    const id = useId();
    const labelId = `${id}-label`;
    const errorId = error ? `${id}-error` : undefined;

    return (
        <FieldContext.Provider value={{ labelId, errorId, invalid: !!error }}>
            <div role="group" aria-labelledby={labelId} aria-describedby={errorId} aria-invalid={!!error || undefined} className={cn('flex flex-col gap-1.5', className)}>
                <Label id={labelId} htmlFor={htmlFor}>{label}</Label>
                {children}
                <InputError id={errorId} message={error} />
            </div>
        </FieldContext.Provider>
    );
}

export function InputError({ id, message, className }: { id?: string; message?: string; className?: string }) {
    if (!message) return null;

    return <p id={id} role="alert" className={cn('text-sm text-destructive', className)}>{message}</p>;
}
