import type { ArticleAliasRecord, CatalogArticle } from '@/types/sewing';

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Maps an article name typed in WhatsApp ("MARINA ONE SET") to a catalog article.
 * Remembered aliases win; then exact name / name + category; then the longest article name the text starts with.
 */
export class ArticleMatcher {
    private readonly aliases: Map<string, number>;

    constructor(
        private readonly articles: CatalogArticle[],
        aliases: ArticleAliasRecord[],
    ) {
        this.aliases = new Map(aliases.map((alias) => [normalize(alias.alias), alias.article_id]));
    }

    match(typedName: string): number | null {
        const name = normalize(typedName);

        if (!name) return null;

        const remembered = this.aliases.get(name);

        if (remembered && this.find(remembered)) return remembered;

        const exact = this.articles.find(
            (article) =>
                normalize(article.display_name) === name ||
                normalize(article.name) === name ||
                normalize(`${article.name} ${article.category_name ?? ''}`) === name,
        );

        if (exact) return exact.id;

        const prefix = this.articles
            .filter((article) => name === normalize(article.name) || name.startsWith(`${normalize(article.name)} `))
            .sort((a, b) => b.name.length - a.name.length)[0];

        return prefix?.id ?? null;
    }

    find(articleId: number | null): CatalogArticle | undefined {
        return articleId === null ? undefined : this.articles.find((article) => article.id === articleId);
    }
}
