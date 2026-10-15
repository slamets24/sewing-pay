import type { ArticleRecord } from '@/types/sewing';

export type ArticleFormData = {
    name: string;
    brand_name: string;
    category_name: string;
    sewing_rate: number;
    notes: string;
};

/**
 * Shapes the article drawer for POST/PATCH /artikel.
 * Only the owner sets rates (and does so inline on the card when editing), and names of packingv2 articles are owned by packingv2,
 * so those fields are left out of the payload instead of being sent unchanged.
 */
export class ArticleForm {
    static blank(): ArticleFormData {
        return { name: '', brand_name: '', category_name: '', sewing_rate: 0, notes: '' };
    }

    static fromRecord(article: ArticleRecord): ArticleFormData {
        return {
            name: article.name,
            brand_name: article.brand_name ?? '',
            category_name: article.category_name ?? '',
            sewing_rate: article.sewing_rate,
            notes: article.notes ?? '',
        };
    }

    static createPayload(data: ArticleFormData, canSetRate: boolean): Partial<ArticleFormData> {
        const payload: Partial<ArticleFormData> = { ...ArticleForm.naming(data), notes: data.notes };

        if (canSetRate) payload.sewing_rate = data.sewing_rate;

        return payload;
    }

    static updatePayload(data: ArticleFormData, article: ArticleRecord): Partial<ArticleFormData> {
        if (!ArticleForm.canRename(article)) return { notes: data.notes };

        return { ...ArticleForm.naming(data), notes: data.notes };
    }

    static canRename(article: ArticleRecord): boolean {
        return article.source === 'manual';
    }

    static variantSummary(article: ArticleRecord): string {
        return `${article.variants_count} varian · ${article.barcode_count} barcode`;
    }

    private static naming(data: ArticleFormData): Pick<ArticleFormData, 'name' | 'brand_name' | 'category_name'> {
        return { name: data.name.trim(), brand_name: data.brand_name.trim(), category_name: data.category_name.trim() };
    }
}
