import { SizeOrder } from './size-order';

export type HancaanVariant = { color: string | null; size: string | null; planned_qty: number };

type Cell = { color: string | null; size: string | null };

/** Immutable colour × size grid of quantities, used to create several hancaan of one article in one save. */
export class VariantMatrix {
    private constructor(
        readonly colors: readonly string[],
        readonly sizes: readonly string[],
        private readonly quantities: ReadonlyMap<string, number>,
    ) {}

    static empty(): VariantMatrix {
        return new VariantMatrix([], [], new Map());
    }

    /** An article without colours or sizes still has one row and one column: a single qty field. */
    get rows(): (string | null)[] {
        return this.colors.length ? [...this.colors] : [null];
    }

    get columns(): (string | null)[] {
        return this.sizes.length ? [...this.sizes] : [null];
    }

    get isSingleCell(): boolean {
        return this.colors.length === 0 && this.sizes.length === 0;
    }

    get variantCount(): number {
        return this.variants().length;
    }

    get totalQty(): number {
        return this.variants().reduce((total, variant) => total + variant.planned_qty, 0);
    }

    hasColor(color: string): boolean {
        return VariantMatrix.find(this.colors, color) !== undefined;
    }

    hasSize(size: string): boolean {
        return VariantMatrix.find(this.sizes, size) !== undefined;
    }

    toggleColor(color: string): VariantMatrix {
        return this.hasColor(color) ? this.withoutColor(color) : this.withColor(color);
    }

    toggleSize(size: string): VariantMatrix {
        return this.hasSize(size) ? this.withoutSize(size) : this.withSize(size);
    }

    withColor(color: string): VariantMatrix {
        const value = color.trim();
        if (!value || this.hasColor(value)) return this;

        // The first colour inherits whatever was already typed into the colourless row.
        const quantities = this.colors.length ? this.quantities : this.remap((cell) => ({ ...cell, color: value }));

        return new VariantMatrix([...this.colors, value], this.sizes, quantities);
    }

    withoutColor(color: string): VariantMatrix {
        const existing = VariantMatrix.find(this.colors, color);
        if (existing === undefined) return this;

        return new VariantMatrix(
            this.colors.filter((item) => item !== existing),
            this.sizes,
            this.keep((cell) => cell.color !== existing),
        );
    }

    withSize(size: string): VariantMatrix {
        const value = size.trim();
        if (!value || this.hasSize(value)) return this;

        // The first size inherits whatever was already typed into the sizeless column.
        const quantities = this.sizes.length ? this.quantities : this.remap((cell) => ({ ...cell, size: value }));

        return new VariantMatrix(this.colors, SizeOrder.sort([...this.sizes, value]), quantities);
    }

    withoutSize(size: string): VariantMatrix {
        const existing = VariantMatrix.find(this.sizes, size);
        if (existing === undefined) return this;

        return new VariantMatrix(
            this.colors,
            this.sizes.filter((item) => item !== existing),
            this.keep((cell) => cell.size !== existing),
        );
    }

    qty(color: string | null, size: string | null): number {
        return this.quantities.get(VariantMatrix.key({ color, size })) ?? 0;
    }

    withQty(color: string | null, size: string | null, qty: number): VariantMatrix {
        const quantities = new Map(this.quantities);
        const key = VariantMatrix.key({ color, size });
        const value = Number.isFinite(qty) ? Math.max(0, Math.round(qty)) : 0;

        if (value > 0) quantities.set(key, value);
        else quantities.delete(key);

        return new VariantMatrix(this.colors, this.sizes, quantities);
    }

    /** Every cell on the grid that has a quantity becomes one hancaan. */
    variants(): HancaanVariant[] {
        return this.rows.flatMap((color) =>
            this.columns.map((size) => ({ color, size, planned_qty: this.qty(color, size) })).filter((variant) => variant.planned_qty > 0),
        );
    }

    private remap(transform: (cell: Cell) => Cell): Map<string, number> {
        return new Map([...this.quantities].map(([key, qty]) => [VariantMatrix.key(transform(VariantMatrix.parse(key))), qty]));
    }

    private keep(predicate: (cell: Cell) => boolean): Map<string, number> {
        return new Map([...this.quantities].filter(([key]) => predicate(VariantMatrix.parse(key))));
    }

    private static find(values: readonly string[], value: string): string | undefined {
        const needle = value.trim().toLowerCase();

        return values.find((item) => item.toLowerCase() === needle);
    }

    private static key(cell: Cell): string {
        return JSON.stringify([cell.color, cell.size]);
    }

    private static parse(key: string): Cell {
        const [color, size] = JSON.parse(key) as [string | null, string | null];

        return { color, size };
    }
}
