export type StatStripItem = { label: string; value: string | number };

/** One compact row of key numbers, so the work list starts above the fold on a phone. */
export function StatStrip({ items }: { items: StatStripItem[] }) {
    return (
        <dl className="grid divide-x rounded-xl border bg-card" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map((item) => (
                <div key={item.label} className="flex flex-col items-center justify-center gap-0.5 px-1 py-2.5 text-center">
                    <dt className="text-xs leading-tight text-muted-foreground">{item.label}</dt>
                    <dd className="text-base font-semibold tabular-nums">{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}
