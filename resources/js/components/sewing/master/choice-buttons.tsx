import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';

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
    const id = useId();
    return (
        <RadioGroup aria-label={label} value={value} onValueChange={(next) => onChange(next as T)} className={cn('grid gap-2 sm:grid-cols-2', className)}>
            {options.map((option) => {
                const selected = option.value === value;
                const Icon = option.icon;

                return (
                    <Label
                        key={option.value}
                        htmlFor={`${id}-${option.value}`}
                        className={cn('flex min-h-14 cursor-pointer items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50', selected ? 'border-primary bg-accent' : 'border-input bg-card')}
                    >
                        <RadioGroupItem id={`${id}-${option.value}`} value={option.value} className="mt-0.5" />
                        <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex items-center gap-2 text-sm font-medium">
                                {Icon && <Icon className="size-5 shrink-0" />}
                                {option.label}
                            </span>
                            {option.description && <span className="text-sm text-muted-foreground">{option.description}</span>}
                        </span>
                    </Label>
                );
            })}
        </RadioGroup>
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
