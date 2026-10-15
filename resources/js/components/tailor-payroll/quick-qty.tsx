import { Button } from '@/components/ui/button';

type QuickQtyProps = {
    amounts: number[];
    max?: number | null;
    maxLabel: string;
    onPick: (qty: string) => void;
};

/** Shortcut buttons for common quantities, clamped to the remaining/available maximum. */
export function QuickQty({ amounts, max, maxLabel, onPick }: QuickQtyProps) {
    const pick = (qty: number) => onPick(String(Math.max(1, max ? Math.min(qty, max) : qty)));

    return (
        <div className="flex flex-wrap gap-2">
            {amounts.map((amount) => (
                <Button key={amount} size="sm" type="button" variant="outline" onClick={() => pick(amount)}>
                    {amount}
                </Button>
            ))}
            {max ? (
                <Button size="sm" type="button" variant="outline" onClick={() => pick(max)}>
                    {maxLabel}
                </Button>
            ) : null}
        </div>
    );
}
