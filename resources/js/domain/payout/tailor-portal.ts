import { daysUntil, dueLabel } from '@/lib/format';
import type { Tone } from '@/lib/tone';
import type { DeliveryRecord, PickupItemRecord, RevisionRecord, TailorRecord } from '@/types/sewing';

export type DueBadge = { label: string; tone: Tone };

/** What a tailor sees about their own work. Makloon tailors are not paid through slips, so money stays hidden for them. */
export class TailorPortal {
    constructor(
        readonly tailor: TailorRecord,
        private readonly holding: PickupItemRecord[],
        private readonly deliveries: DeliveryRecord[],
        private readonly revisions: RevisionRecord[],
    ) {}

    get isMakloon(): boolean {
        return this.tailor.type === 'makloon';
    }

    get showsMoney(): boolean {
        return !this.isMakloon;
    }

    get holdingQty(): number {
        return this.holding.reduce((total, item) => total + item.remaining_qty, 0);
    }

    get openRevisionQty(): number {
        return this.revisions.reduce((total, revision) => total + revision.qty, 0);
    }

    get recentDeliveredQty(): number {
        return this.deliveries.reduce((total, delivery) => total + delivery.qty, 0);
    }

    /** "Selamat pagi/siang/sore/malam", by the device clock. */
    static greeting(now: Date = new Date()): string {
        const hour = now.getHours();

        if (hour < 11) return 'Selamat pagi';
        if (hour < 15) return 'Selamat siang';
        if (hour < 18) return 'Selamat sore';

        return 'Selamat malam';
    }

    /** Deadline pill: red when late, orange when due within two days, grey otherwise. */
    static dueBadge(dueAt: string | null): DueBadge | null {
        const label = dueLabel(dueAt);

        if (!dueAt || !label) return null;

        const days = daysUntil(dueAt);
        const tone: Tone = days < 0 ? 'revision' : days <= 2 ? 'sewing' : 'neutral';

        return { label: `Deadline: ${label}`, tone };
    }
}
