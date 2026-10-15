import { formatIdr } from '@/lib/format';
import type { Tone } from '@/lib/tone';
import type { RevisionRecord, RevisionStatus, RevisionType } from '@/types/sewing';

export type RevisionStatusFilter = 'open' | 'done' | 'all';

/** The status / type chips on the revision list, turned into query params for the server. */
export class RevisionFilter {
    static readonly statusOptions: { value: RevisionStatusFilter; label: string }[] = [
        { value: 'open', label: 'Belum selesai' },
        { value: 'done', label: 'Selesai' },
        { value: 'all', label: 'Semua' },
    ];

    static readonly typeOptions: { value: RevisionType | 'any'; label: string }[] = [
        { value: 'any', label: 'Semua jenis' },
        { value: 'material', label: 'Revisi bahan' },
        { value: 'sewing', label: 'Revisi jahit' },
    ];

    constructor(
        readonly status: RevisionStatusFilter,
        readonly type: RevisionType | null,
    ) {}

    static from(filters: { status: string; type: string | null }): RevisionFilter {
        const status = RevisionFilter.statusOptions.some((option) => option.value === filters.status) ? (filters.status as RevisionStatusFilter) : 'open';
        const type = filters.type === 'material' || filters.type === 'sewing' ? filters.type : null;

        return new RevisionFilter(status, type);
    }

    get typeChoice(): RevisionType | 'any' {
        return this.type ?? 'any';
    }

    withStatus(status: RevisionStatusFilter): RevisionFilter {
        return new RevisionFilter(status, this.type);
    }

    withTypeChoice(choice: RevisionType | 'any'): RevisionFilter {
        return new RevisionFilter(this.status, choice === 'any' ? null : choice);
    }

    toQuery(): Record<string, string> {
        return this.type ? { status: this.status, type: this.type } : { status: this.status };
    }

    get emptyMessage(): string {
        if (this.status === 'open') return 'Tidak ada revisi yang masih berjalan.';
        if (this.status === 'done') return 'Belum ada revisi yang selesai.';

        return 'Belum ada catatan revisi.';
    }
}

const STATUS_ORDER: RevisionStatus[] = ['waiting_material', 'material_ready', 'in_progress', 'done'];

/** How a revision reads on screen: one color per type, money in plain words. */
export class RevisionView {
    /** Material fixes are paid and wait for parts (red family); sewing fixes are free (grey). */
    static typeTone(type: RevisionType): Tone {
        return type === 'material' ? 'revision' : 'other';
    }

    static money(revision: Pick<RevisionRecord, 'type' | 'subtotal'>): string {
        return revision.type === 'sewing' ? 'Gratis' : formatIdr(revision.subtotal);
    }

    /** How many revisions sit in each status, in workflow order (empty statuses left out). */
    static statusCounts(revisions: RevisionRecord[]): { status: RevisionStatus; label: string; count: number }[] {
        return STATUS_ORDER.map((status) => {
            const matching = revisions.filter((revision) => revision.status === status);

            return { status, label: matching[0]?.status_label ?? status, count: matching.length };
        }).filter((row) => row.count > 0);
    }
}
