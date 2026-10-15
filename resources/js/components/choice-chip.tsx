import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

type ChoiceChipProps = {
    selected: boolean;
    onToggle: () => void;
    children: ReactNode;
};

/** Pill-shaped toggle used for picking colours and sizes. */
export function ChoiceChip({ selected, onToggle, children }: ChoiceChipProps) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onToggle}
            className={cn(
                'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent',
            )}
        >
            {selected && <Check className="size-3.5" />}
            {children}
        </button>
    );
}
