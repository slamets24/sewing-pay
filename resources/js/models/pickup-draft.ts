import type { Article } from '@/types';

export type PickupStep = 'tailor' | 'article' | 'qty';

/** Immutable state of the "who → what → how many" pickup flow; every change returns a new draft. */
export class PickupDraft {
    private constructor(
        readonly tailorId: number | null,
        readonly article: Article | null,
        readonly qty: number,
        readonly notes: string,
    ) {}

    static start(tailorId: number | null = null): PickupDraft {
        return new PickupDraft(tailorId, null, 0, '');
    }

    get step(): PickupStep {
        if (this.tailorId === null) return 'tailor';
        if (this.article === null) return 'article';

        return 'qty';
    }

    get maxQty(): number {
        return this.article?.available_qty ?? 0;
    }

    get isComplete(): boolean {
        return this.tailorId !== null && this.article !== null && this.qty >= 1 && this.qty <= this.maxQty;
    }

    get estimatedWage(): number {
        return this.qty * (this.article?.rate_amount ?? 0);
    }

    withTailor(tailorId: number | null): PickupDraft {
        return new PickupDraft(tailorId, this.article, this.qty, this.notes);
    }

    withArticle(article: Article | null): PickupDraft {
        return new PickupDraft(this.tailorId, article, 0, this.notes);
    }

    withQty(qty: number): PickupDraft {
        const clamped = Number.isFinite(qty) ? Math.min(Math.max(0, Math.round(qty)), this.maxQty) : 0;

        return new PickupDraft(this.tailorId, this.article, clamped, this.notes);
    }

    withNotes(notes: string): PickupDraft {
        return new PickupDraft(this.tailorId, this.article, this.qty, notes);
    }

    /** Re-binds the chosen article to fresh server data, since stock changes after every save. */
    syncWith(articles: Article[]): PickupDraft {
        if (!this.article) return this;

        const fresh = articles.find((article) => article.id === this.article?.id);

        return fresh ? new PickupDraft(this.tailorId, fresh, Math.min(this.qty, fresh.available_qty), this.notes) : this.withArticle(null);
    }

    toPayload(): { tailor_id: number | null; production_article_id: number | null; assigned_qty: number; notes: string | null } {
        return {
            tailor_id: this.tailorId,
            production_article_id: this.article?.id ?? null,
            assigned_qty: this.qty,
            notes: this.notes.trim() || null,
        };
    }
}
