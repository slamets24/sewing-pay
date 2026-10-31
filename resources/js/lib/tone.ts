import type { RevisionStatus, Stage } from '@/types/sewing';

/** Color families used across the floor UI. Each stage of the goods has its own fixed color. */
export type Tone = 'other' | 'ready' | 'sewing' | 'done' | 'revision' | 'qc' | 'primary' | 'neutral';

const SOFT: Record<Tone, string> = {
    other: 'border-stage-other/35 bg-stage-other/12 text-stage-other',
    ready: 'border-stage-ready/35 bg-stage-ready/12 text-stage-ready',
    sewing: 'border-stage-sewing/40 bg-stage-sewing/14 text-stage-sewing',
    done: 'border-stage-done/35 bg-stage-done/12 text-stage-done',
    revision: 'border-stage-revision/35 bg-stage-revision/12 text-stage-revision',
    qc: 'border-stage-qc/35 bg-stage-qc/12 text-stage-qc',
    primary: 'border-primary/25 bg-primary/10 text-primary',
    neutral: 'border-border bg-muted text-foreground',
};

const SOLID: Record<Tone, string> = {
    other: 'bg-stage-other text-white',
    ready: 'bg-stage-ready text-white',
    sewing: 'bg-stage-sewing text-white',
    done: 'bg-stage-done text-white',
    revision: 'bg-stage-revision text-white',
    qc: 'bg-stage-qc text-white',
    primary: 'bg-primary text-primary-foreground',
    neutral: 'bg-foreground text-background',
};

const TOP_BORDER: Record<Tone, string> = {
    other: 'border-t-stage-other',
    ready: 'border-t-stage-ready',
    sewing: 'border-t-stage-sewing',
    done: 'border-t-stage-done',
    revision: 'border-t-stage-revision',
    qc: 'border-t-stage-qc',
    primary: 'border-t-primary',
    neutral: 'border-t-foreground',
};

export class ToneStyle {
    static topBorder(tone: Tone): string {
        return TOP_BORDER[tone];
    }

    static soft(tone: Tone): string {
        return SOFT[tone];
    }

    static solid(tone: Tone): string {
        return SOLID[tone];
    }

    static forStage(stage: Stage): Tone {
        return ({
            other_division: 'other',
            printing: 'other',
            cutting: 'primary',
            ready: 'ready',
            internal_sewing: 'sewing',
            makloon_sewing: 'qc',
            sewing: 'sewing',
            waiting_revision: 'revision',
            done: 'done',
        } as const)[stage];
    }

    static forRevisionStatus(status: RevisionStatus): Tone {
        return ({ waiting_material: 'revision', material_ready: 'ready', in_progress: 'sewing', done: 'done' } as const)[status];
    }
}
