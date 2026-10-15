import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/domain/master/money-input';
import { cn } from '@/lib/utils';

type MoneyFieldProps = {
    id?: string;
    value: number;
    onChange: (value: number) => void;
    invalid?: boolean;
    className?: string;
    'aria-label'?: string;
};

/** Rupiah amount field: digits only, shown with thousand dots, "Rp" in front. */
export function MoneyField({ id, value, onChange, invalid, className, ...props }: MoneyFieldProps) {
    return (
        <div className={cn('relative', className)}>
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base font-semibold text-muted-foreground" aria-hidden>
                Rp
            </span>
            <Input
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={MoneyInput.display(value)}
                onChange={(event) => onChange(MoneyInput.parse(event.target.value))}
                aria-invalid={invalid || undefined}
                aria-label={props['aria-label']}
                className="pl-11 text-lg font-bold tabular"
            />
        </div>
    );
}
