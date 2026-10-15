import { Input } from '@/components/ui/input';
import { SlipAdjustment } from '@/domain/payout/slip-adjustment';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

type AmountInputProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type' | 'inputMode'> & {
    /** Digits only, e.g. "50000". Shown with thousand dots. */
    value: string;
    onValueChange: (digits: string) => void;
};

/** Rupiah field with a number keypad on phones; keeps digits only and shows them as "50.000". */
export function AmountInput({ value, onValueChange, className, ...props }: AmountInputProps) {
    return (
        <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base font-semibold text-muted-foreground" aria-hidden>
                Rp
            </span>
            <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={SlipAdjustment.groupDigits(value)}
                onChange={(event) => onValueChange(SlipAdjustment.cleanInput(event.target.value))}
                className={cn('pl-11 text-lg font-semibold tabular', className)}
                {...props}
            />
        </div>
    );
}
