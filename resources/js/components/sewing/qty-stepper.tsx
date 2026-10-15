import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';

type QtyStepperProps = {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    id?: string;
    className?: string;
    label?: string;
};

/** Large − / + buttons around a number field, easy to hit with a thumb. */
export function QtyStepper({ value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER, id, className, label = 'Jumlah' }: QtyStepperProps) {
    const clamp = (next: number) => Math.min(max, Math.max(min, Number.isFinite(next) ? Math.round(next) : min));

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <Button type="button" variant="outline" size="icon" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={`Kurangi ${label}`}>
                <Minus />
            </Button>
            <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                value={value}
                onChange={(event) => onChange(clamp(Number(event.target.value)))}
                className="w-20 text-center text-lg font-bold tabular"
                aria-label={label}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={`Tambah ${label}`}>
                <Plus />
            </Button>
        </div>
    );
}
