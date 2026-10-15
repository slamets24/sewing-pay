import type { ArticleRecord } from '@/types/sewing';
import { TextSearch } from './text-search';

export type ArticleFilterKey = 'all' | 'no_rate' | 'packingv2' | 'manual' | 'inactive';

type FilterDefinition = {
    key: ArticleFilterKey;
    label: string;
    test: (article: ArticleRecord) => boolean;
};

const FILTERS: FilterDefinition[] = [
    { key: 'all', label: 'Semua', test: () => true },
    { key: 'no_rate', label: 'Tarif belum diisi', test: (article) => ArticleFilter.needsRate(article) },
    { key: 'packingv2', label: 'packingv2', test: (article) => article.source === 'packingv2' },
    { key: 'manual', label: 'Manual', test: (article) => article.source === 'manual' },
    { key: 'inactive', label: 'Nonaktif', test: (article) => !article.is_active },
];

export type ArticleFilterOption = { value: ArticleFilterKey; label: string; count: number };

/** Which articles the list shows: one filter chip plus a free-text search. Immutable. */
export class ArticleFilter {
    private constructor(
        readonly key: ArticleFilterKey,
        readonly query: string,
    ) {}

    static initial(): ArticleFilter {
        return new ArticleFilter('all', '');
    }

    withKey(key: ArticleFilterKey): ArticleFilter {
        return new ArticleFilter(key, this.query);
    }

    withQuery(query: string): ArticleFilter {
        return new ArticleFilter(this.key, query);
    }

    apply(articles: ArticleRecord[]): ArticleRecord[] {
        const search = new TextSearch(this.query);
        const test = ArticleFilter.definition(this.key).test;

        return articles.filter(
            (article) => test(article) && search.matches(article.display_name, article.name, article.brand_name, article.category_name),
        );
    }

    /** Chips with how many articles each would show (ignoring the search text). */
    static options(articles: ArticleRecord[]): ArticleFilterOption[] {
        return FILTERS.map((filter) => ({ value: filter.key, label: filter.label, count: articles.filter(filter.test).length }));
    }

    /** Active articles still at Rp 0 cannot be paid correctly, so the owner should fill them first. */
    static needsRate(article: ArticleRecord): boolean {
        return article.is_active && article.sewing_rate <= 0;
    }

    private static definition(key: ArticleFilterKey): FilterDefinition {
        return FILTERS.find((filter) => filter.key === key) ?? FILTERS[0];
    }
}
