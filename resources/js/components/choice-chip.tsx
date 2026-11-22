import { Toggle } from '@/components/ui/toggle';
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
        <Toggle
            type="button"
            pressed={selected}
            onPressedChange={onToggle}
            className={cn(
                'h-8 min-w-0 gap-1 border px-3 text-sm font-medium transition-colors data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent',
            )}
        >
            {selected && <Check className="size-3.5" />}
            {children}
        </Toggle>
    );
}
