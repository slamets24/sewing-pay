import { cn } from '@/lib/utils';
import { Check, type LucideIcon } from 'lucide-react';

export type ChoiceOption<T extends string> = {
    value: T;
    label: string;
    description?: string;
    icon?: LucideIcon;
};

type ChoiceButtonsProps<T extends string> = {
    /** Read out by screen readers for the whole group. */
    label: string;
    value: T;
    options: ChoiceOption<T>[];
    onChange: (value: T) => void;
    className?: string;
};

/** Big pick-one buttons with a short explanation each; easier to hit and read than a dropdown. */
export function ChoiceButtons<T extends string>({ label, value, options, onChange, className }: ChoiceButtonsProps<T>) {
    return (
        <div role="group" aria-label={label} className={cn('grid gap-2 sm:grid-cols-2', className)}>
            {options.map((option) => {
                const selected = option.value === value;
                const Icon = option.icon;

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'flex min-h-14 items-start gap-3 rounded-lg border-2 p-3 text-left text-foreground transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                            selected ? 'border-primary bg-primary/15' : 'border-input bg-card hover:bg-accent',
                        )}
                    >
                        <span
                            aria-hidden
                            className={cn(
                                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background',
                            )}
                        >
                            {selected && <Check className="size-4" />}
                        </span>
                        <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex items-center gap-2 text-base font-semibold">
                                {Icon && <Icon className="size-5 shrink-0" />}
                                {option.label}
                            </span>
                            {option.description && <span className="text-sm text-muted-foreground">{option.description}</span>}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

type ActiveChoiceProps = {
    value: boolean;
    onChange: (value: boolean) => void;
    activeHint?: string;
    inactiveHint?: string;
};

/** Aktif / Nonaktif as two big buttons. */
export function ActiveChoice({ value, onChange, activeHint, inactiveHint }: ActiveChoiceProps) {
    return (
        <ChoiceButtons
            label="Status"
            value={value ? 'active' : 'inactive'}
            onChange={(next) => onChange(next === 'active')}
            options={[
                { value: 'active', label: 'Aktif', description: activeHint },
                { value: 'inactive', label: 'Nonaktif', description: inactiveHint },
            ]}
        />
    );
}
