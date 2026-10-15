export type ParsedLine = { color: string; size: string; qty: number };

export type ParsedGroup = {
    /** Article name exactly as typed in WhatsApp, e.g. "MARINA ONE SET". */
    name: string;
    /** Total written in brackets after the name, e.g. (17). */
    declaredQty: number | null;
    category: string | null;
    lines: ParsedLine[];
};

export type ParsedWorkOrder = {
    number: string;
    channel: string | null;
    orderedAt: string | null;
    category: string | null;
    groups: ParsedGroup[];
    warnings: string[];
};

const MONTHS: Record<string, number> = {
    januari: 1, jan: 1, februari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5, may: 5, juni: 6, jun: 6,
    juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, aug: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, oct: 10,
    november: 11, nov: 11, desember: 12, des: 12, dec: 12,
};

const SIZE_TOKEN = /^(xxs|xs|s|m|l|xl|xxl|xxxl|[2-6]xl|allsize|all|std)(\d+)$/i;
const ARTICLE_HEADER = /^(.+?)\s*\((\d+)\)\s*$/;
const DATE_LINE = /^(\d{1,2})[\s\-/]+([a-z]+)[\s\-/]+(\d{4})$/i;

/**
 * Reads the work-order text the office sends on WhatsApp:
 *
 *   LOKA 324
 *   ORDERAN RESELLER & TOKO ONLINE
 *   01 OKTOBER 2026
 *
 *   PRINT
 *   MARINA ONE SET (17)
 *   Teal blue S1 m1 l1 xl1
 *
 * The first paragraph is the header (number, channel, date). After it, an ALL-CAPS line is a category,
 * "NAME (n)" starts an article, and "<color> <size><qty> …" lines are its variants.
 */
export class WorkOrderTextParser {
    parse(text: string): ParsedWorkOrder {
        const lines = text.replace(/\r/g, '').split('\n').map((line) => line.replace(/[*_~]/g, '').trim());
        const headerEnd = this.headerEnd(lines);
        const header = lines.slice(0, headerEnd).filter(Boolean);
        const warnings: string[] = [];

        let orderedAt: string | null = null;
        const channelParts: string[] = [];

        for (const line of header.slice(1)) {
            const date = this.parseDate(line);

            if (date) orderedAt = date;
            else channelParts.push(line);
        }

        const groups: ParsedGroup[] = [];
        let category: string | null = null;
        let current: ParsedGroup | null = null;

        const body = lines.slice(headerEnd);

        body.forEach((line, index) => {
            if (!line) return;

            const articleMatch = line.match(ARTICLE_HEADER);

            if (articleMatch) {
                current = { name: articleMatch[1].trim(), declaredQty: Number(articleMatch[2]), category, lines: [] };
                groups.push(current);
                return;
            }

            const variant = this.parseVariant(line);

            if (variant && current) {
                current.lines.push(...variant.lines);
                if (variant.unknown.length) warnings.push(`"${line}": bagian "${variant.unknown.join(' ')}" tidak dikenali.`);
                return;
            }

            if (!variant && this.nextLineIsVariant(body, index)) {
                current = { name: line, declaredQty: null, category, lines: [] };
                groups.push(current);
                return;
            }

            if (this.isCategory(line)) {
                category = line;
                current = null;
                return;
            }

            warnings.push(variant && !current ? `"${line}" ada sebelum nama artikel.` : `Baris tidak dikenali: "${line}".`);
        });

        for (const group of groups) {
            const counted = group.lines.reduce((sum, line) => sum + line.qty, 0);

            if (group.declaredQty !== null && counted !== group.declaredQty) {
                warnings.push(`${group.name}: tertulis (${group.declaredQty}) tapi rinciannya ${counted} pcs.`);
            }
        }

        return {
            number: header[0] ?? '',
            channel: channelParts.join(' · ') || null,
            orderedAt,
            category: groups.find((group) => group.category)?.category ?? null,
            groups,
            warnings,
        };
    }

    /** The header is the first paragraph, or everything before the first article/category line when there is no blank line. */
    private headerEnd(lines: string[]): number {
        const firstContent = lines.findIndex(Boolean);
        const firstBlank = lines.findIndex((line, index) => index > firstContent && line === '');
        const firstArticle = lines.findIndex((line) => ARTICLE_HEADER.test(line));

        if (firstBlank !== -1 && (firstArticle === -1 || firstBlank < firstArticle)) return firstBlank;
        if (firstArticle === -1) return lines.length;

        const beforeArticle = firstArticle - 1;

        return beforeArticle > firstContent && this.isCategory(lines[beforeArticle]) ? beforeArticle : firstArticle;
    }

    private parseVariant(line: string): { lines: ParsedLine[]; unknown: string[] } | null {
        const tokens = line.split(/\s+/);
        const firstSize = tokens.findIndex((token) => SIZE_TOKEN.test(token));

        if (firstSize <= 0) return null;

        const color = tokens.slice(0, firstSize).join(' ');
        const parsed: ParsedLine[] = [];
        const unknown: string[] = [];

        for (const token of tokens.slice(firstSize)) {
            const match = token.match(SIZE_TOKEN);

            if (match) parsed.push({ color, size: WorkOrderTextParser.normalizeSize(match[1]), qty: Number(match[2]) });
            else unknown.push(token);
        }

        return { lines: parsed.filter((item) => item.qty > 0), unknown };
    }

    /** An article written without "(n)" is recognised by the color/size line right under it. */
    private nextLineIsVariant(body: string[], index: number): boolean {
        const next = body.slice(index + 1).find(Boolean);

        return next !== undefined && this.parseVariant(next) !== null;
    }

    private isCategory(line: string): boolean {
        return line.length <= 30 && !/\d/.test(line) && line === line.toUpperCase() && /[A-Z]/.test(line);
    }

    private parseDate(line: string): string | null {
        const match = line.match(DATE_LINE);
        const month = match ? MONTHS[match[2].toLowerCase()] : undefined;

        if (!match || !month) return null;

        return `${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }

    static normalizeSize(size: string): string {
        const upper = size.toUpperCase();

        return upper === 'ALL' ? 'ALLSIZE' : upper;
    }
}
