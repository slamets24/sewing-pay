import type { HancaanSuggestions } from '@/types';
import { SizeOrder } from './size-order';

/** Recently used article names, colours and sizes, offered as one-tap choices in the hancaan form. */
export class HancaanSuggestionBook {
    constructor(private readonly suggestions: HancaanSuggestions) {}

    get articleNames(): string[] {
        return this.suggestions.articles.map((article) => article.name);
    }

    /** The tariff last used for an article with this name, so the admin doesn't have to pick it again. */
    workTypeFor(articleName: string): number | null {
        const needle = articleName.trim().toLowerCase();

        return this.suggestions.articles.find((article) => article.name.toLowerCase() === needle)?.work_type_id ?? null;
    }

    colorChoices(selected: readonly string[] = []): string[] {
        return HancaanSuggestionBook.unique([...this.suggestions.colors, ...selected]);
    }

    sizeChoices(selected: readonly string[] = []): string[] {
        return SizeOrder.sort(HancaanSuggestionBook.unique([...SizeOrder.defaults, ...this.suggestions.sizes, ...selected]));
    }

    private static unique(values: string[]): string[] {
        const seen = new Map<string, string>();

        for (const value of values.map((item) => item.trim()).filter(Boolean)) {
            if (!seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
        }

        return [...seen.values()];
    }
}
