import { todayIso } from '@/lib/format';
import type { ArticleMatcher } from './article-matcher';
import type { ParsedWorkOrder } from './work-order-text-parser';

export type DraftLine = { key: string; color: string; size: string; qty: number };

export type DraftGroup = {
    key: string;
    /** Name as typed in WhatsApp; remembered by the server as an alias once an article is chosen. */
    alias: string | null;
    articleId: number | null;
    declaredQty: number | null;
    lines: DraftLine[];
};

export type DraftHeader = {
    number: string;
    channel: string;
    category: string;
    ordered_at: string;
    due_at: string;
    notes: string;
    is_opening_stock: boolean;
};

export type WorkOrderPayload = DraftHeader & {
    source_text: string | null;
    items: { article_id: number | null; color: string; size: string; planned_qty: number; alias: string | null }[];
};

let sequence = 0;
const nextKey = () => `k${++sequence}`;
const emptyLine = (): DraftLine => ({ key: nextKey(), color: '', size: '', qty: 1 });

/** Immutable state of the "new work order" form. Every edit returns a new draft. */
export class WorkOrderDraft {
    private constructor(
        readonly header: DraftHeader,
        readonly groups: DraftGroup[],
        readonly sourceText: string | null,
    ) {}

    static empty(): WorkOrderDraft {
        return new WorkOrderDraft(
            { number: '', channel: '', category: '', ordered_at: todayIso(), due_at: '', notes: '', is_opening_stock: false },
            [{ key: nextKey(), alias: null, articleId: null, declaredQty: null, lines: [emptyLine()] }],
            null,
        );
    }

    static fromParsed(parsed: ParsedWorkOrder, matcher: ArticleMatcher, sourceText: string, previous: WorkOrderDraft): WorkOrderDraft {
        return new WorkOrderDraft(
            {
                ...previous.header,
                number: parsed.number,
                channel: parsed.channel ?? '',
                category: parsed.category ?? '',
                ordered_at: parsed.orderedAt ?? previous.header.ordered_at,
            },
            parsed.groups.map((group) => ({
                key: nextKey(),
                alias: group.name,
                articleId: matcher.match(group.name),
                declaredQty: group.declaredQty,
                lines: group.lines.map((line) => ({ key: nextKey(), ...line })),
            })),
            sourceText,
        );
    }

    withHeader(changes: Partial<DraftHeader>): WorkOrderDraft {
        return new WorkOrderDraft({ ...this.header, ...changes }, this.groups, this.sourceText);
    }

    withGroup(key: string, changes: Partial<Omit<DraftGroup, 'key' | 'lines'>>): WorkOrderDraft {
        return this.mapGroups((group) => (group.key === key ? { ...group, ...changes } : group));
    }

    addGroup(): WorkOrderDraft {
        return new WorkOrderDraft(this.header, [...this.groups, { key: nextKey(), alias: null, articleId: null, declaredQty: null, lines: [emptyLine()] }], this.sourceText);
    }

    removeGroup(key: string): WorkOrderDraft {
        return new WorkOrderDraft(this.header, this.groups.filter((group) => group.key !== key), this.sourceText);
    }

    addLine(groupKey: string): WorkOrderDraft {
        return this.mapGroups((group) => {
            if (group.key !== groupKey) return group;

            const last = group.lines[group.lines.length - 1];

            return { ...group, lines: [...group.lines, { ...emptyLine(), color: last?.color ?? '' }] };
        });
    }

    withLine(groupKey: string, lineKey: string, changes: Partial<Omit<DraftLine, 'key'>>): WorkOrderDraft {
        return this.mapGroups((group) =>
            group.key === groupKey ? { ...group, lines: group.lines.map((line) => (line.key === lineKey ? { ...line, ...changes } : line)) } : group,
        );
    }

    removeLine(groupKey: string, lineKey: string): WorkOrderDraft {
        return this.mapGroups((group) => (group.key === groupKey ? { ...group, lines: group.lines.filter((line) => line.key !== lineKey) } : group));
    }

    static countedQty(group: DraftGroup): number {
        return group.lines.reduce((sum, line) => sum + (line.qty || 0), 0);
    }

    get totalQty(): number {
        return this.groups.reduce((sum, group) => sum + WorkOrderDraft.countedQty(group), 0);
    }

    get unmatchedGroups(): DraftGroup[] {
        return this.groups.filter((group) => group.articleId === null);
    }

    /** Reasons the form cannot be saved yet, in plain words. */
    get problems(): string[] {
        const problems: string[] = [];

        if (!this.header.number.trim()) problems.push('Nomor WO belum diisi.');
        if (this.groups.length === 0) problems.push('Belum ada artikel.');
        if (this.unmatchedGroups.length) problems.push(`${this.unmatchedGroups.length} artikel belum dipilih dari daftar.`);
        if (this.groups.some((group) => group.lines.length === 0 || group.lines.some((line) => line.qty < 1))) problems.push('Ada baris dengan qty kosong.');

        return problems;
    }

    toPayload(): WorkOrderPayload {
        return {
            ...this.header,
            source_text: this.sourceText,
            items: this.groups.flatMap((group) =>
                group.lines.map((line) => ({
                    article_id: group.articleId,
                    color: line.color.trim(),
                    size: line.size.trim(),
                    planned_qty: line.qty,
                    alias: group.alias,
                })),
            ),
        };
    }

    private mapGroups(map: (group: DraftGroup) => DraftGroup): WorkOrderDraft {
        return new WorkOrderDraft(this.header, this.groups.map(map), this.sourceText);
    }
}
