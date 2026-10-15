import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

type SegmentedChoiceProps<T extends string> = {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    className?: string;
};

/** A row of big toggle buttons where exactly one is on; the chosen one also gets a tick, not only a color. */
export function SegmentedChoice<T extends string>({ options, value, onChange, label, className }: SegmentedChoiceProps<T>) {
    return (
        <div role="group" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
            {options.map((option) => {
                const active = option.value === value;

                return (
                    <Button
                        key={option.value}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        aria-pressed={active}
                        onClick={() => onChange(option.value)}
                        className={cn('min-w-0', active && 'shadow-sm')}
                    >
                        {active && <Check aria-hidden />}
                        {option.label}
                    </Button>
                );
            })}
        </div>
    );
}
