import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';

type ConfirmButtonProps = Omit<ComponentProps<typeof Button>, 'onClick' | 'children'> & {
    children: ReactNode;
    confirmLabel: ReactNode;
    onConfirm: () => void;
    /** Classes for the resting state only (e.g. a muted text colour), dropped once the button turns destructive. */
    idleClassName?: string;
};

const ARMED_MS = 4000;

/** Two-tap button for destructive actions: the first tap arms it, the second (within a few seconds) confirms. */
export function ConfirmButton({ children, confirmLabel, onConfirm, variant = 'outline', className, idleClassName, ...props }: ConfirmButtonProps) {
    const [armed, setArmed] = useState(false);

    useEffect(() => {
        if (!armed) return;

        const timer = window.setTimeout(() => setArmed(false), ARMED_MS);

        return () => window.clearTimeout(timer);
    }, [armed]);

    const handleClick = () => {
        if (!armed) return setArmed(true);

        setArmed(false);
        onConfirm();
    };

    return (
        <Button
            type="button"
            variant={armed ? 'destructive' : variant}
            aria-live="polite"
            className={cn(className, !armed && idleClassName)}
            onClick={handleClick}
            {...props}
        >
            {armed ? confirmLabel : children}
        </Button>
    );
}
