/** Case- and spacing-insensitive "contains every word" search over a few text fields. */
export class TextSearch {
    private readonly terms: string[];

    constructor(query: string) {
        this.terms = TextSearch.normalize(query).split(' ').filter(Boolean);
    }

    get isEmpty(): boolean {
        return this.terms.length === 0;
    }

    matches(...fields: Array<string | null | undefined>): boolean {
        if (this.isEmpty) return true;

        const haystack = TextSearch.normalize(fields.filter(Boolean).join(' '));

        return this.terms.every((term) => haystack.includes(term));
    }

    static normalize(value: string): string {
        return value.toLocaleLowerCase('id-ID').replace(/\s+/g, ' ').trim();
    }
}
