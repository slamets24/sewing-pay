import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type FormFieldProps = {
    label: string;
    htmlFor?: string;
    error?: string;
    className?: string;
    children: ReactNode;
};

export function FormField({ label, htmlFor, error, className, children }: FormFieldProps) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

export function InputError({ message, className }: { message?: string; className?: string }) {
    if (!message) return null;

    return <p className={cn('text-sm text-destructive', className)}>{message}</p>;
}
