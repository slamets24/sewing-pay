import { cn } from '@/lib/utils';

export type FilterChipOption<T extends string> = { value: T; label: string; count: number };

type FilterChipsProps<T extends string> = {
    label: string;
    value: T;
    options: FilterChipOption<T>[];
    onChange: (value: T) => void;
};

/** Row of large pill buttons, each with how many items it would show. Wraps instead of scrolling sideways. */
export function FilterChips<T extends string>({ label, value, options, onChange }: FilterChipsProps<T>) {
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-2">
            {options.map((option) => {
                const selected = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-base font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                            selected ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm shadow-primary/20' : 'border-input bg-card text-foreground hover:bg-accent',
                        )}
                    >
                        {option.label}
                        <span className={cn('rounded-full px-2 text-sm tabular', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
                            {option.count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
