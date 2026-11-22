import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
                    <Button variant={selected ? 'default' : 'outline'}
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(option.value)}
                        className="h-auto min-h-11 whitespace-normal md:min-h-9"
                    >
                        {option.label}
                        <Badge variant="secondary" className={selected ? 'bg-primary-foreground/15 text-primary-foreground' : undefined}>
                            {option.count}
                        </Badge>
                    </Button>
                );
            })}
        </div>
    );
}
