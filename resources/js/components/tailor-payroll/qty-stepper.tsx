import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';

type QtyStepperProps = {
    id: string;
    value: number;
    max: number;
    onChange: (qty: number) => void;
    /** Shortcut amounts; the last chip always offers the maximum. */
    presets?: number[];
    maxLabel?: string;
};

/** Big-thumb quantity input: − / number / + with optional shortcut chips, clamped to 0..max. */
export function QtyStepper({ id, value, max, onChange, presets = [], maxLabel = 'Semua' }: QtyStepperProps) {
    const set = (qty: number) => onChange(Math.min(Math.max(0, Math.round(qty) || 0), max));
    const chips = presets.filter((preset) => preset < max);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon-lg" aria-label="Kurangi qty" disabled={value <= 0} onClick={() => set(value - 1)}>
                    <Minus />
                </Button>
                <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={max}
                    value={value || ''}
                    placeholder="0"
                    onChange={(event) => set(Number(event.target.value))}
                    className="h-10 text-center text-lg font-semibold tabular-nums"
                />
                <Button type="button" variant="outline" size="icon-lg" aria-label="Tambah qty" disabled={value >= max} onClick={() => set(value + 1)}>
                    <Plus />
                </Button>
            </div>
            {max > 0 && (
                <div className="flex flex-wrap gap-2">
                    {chips.map((preset) => (
                        <Button key={preset} type="button" size="sm" variant={value === preset ? 'secondary' : 'outline'} onClick={() => set(preset)}>
                            {preset}
                        </Button>
                    ))}
                    <Button type="button" size="sm" variant={value === max ? 'secondary' : 'outline'} onClick={() => set(max)}>
                        {maxLabel} {max}
                    </Button>
                </div>
            )}
        </div>
    );
}
