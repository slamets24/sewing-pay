/** Orders garment sizes the way a size chart reads them: letter sizes small to large, then numbers, then the rest. */
export class SizeOrder {
    static readonly defaults = ['S', 'M', 'L', 'XL', 'XXL'];

    private static readonly letterSizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL', '5XL'];

    static sort(sizes: Iterable<string>): string[] {
        return [...sizes].sort((a, b) => SizeOrder.compare(a, b));
    }

    static compare(a: string, b: string): number {
        const [groupA, rankA] = SizeOrder.rank(a);
        const [groupB, rankB] = SizeOrder.rank(b);

        if (groupA !== groupB) return groupA - groupB;
        if (rankA !== rankB) return rankA - rankB;

        return a.localeCompare(b, 'id');
    }

    private static rank(size: string): [group: number, rank: number] {
        const letterIndex = SizeOrder.letterSizes.indexOf(size.trim().toUpperCase());
        if (letterIndex >= 0) return [0, letterIndex];

        const numeric = Number(size);
        if (size.trim() !== '' && Number.isFinite(numeric)) return [1, numeric];

        return [2, 0];
    }
}
