import type { Assignment, Tailor } from '@/types';
import { ActiveAssignment } from './active-assignment';
import type { CurrentPeriod } from './current-period';

/** Everything one tailor is currently sewing, plus their earnings in the running payroll period. */
export class TailorWorkload {
    constructor(
        readonly tailorId: number,
        readonly name: string,
        readonly assignments: ActiveAssignment[],
        readonly periodWage: number,
        readonly periodQty: number,
    ) {}

    get isIdle(): boolean {
        return this.assignments.length === 0;
    }

    get remainingQty(): number {
        return this.assignments.reduce((total, assignment) => total + assignment.remainingQty, 0);
    }

    get initials(): string {
        return this.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0].toUpperCase())
            .join('');
    }

    get summary(): string {
        return this.isIdle ? 'Belum ada kerjaan' : `${this.assignments.length} kerjaan · sisa ${this.remainingQty} pcs`;
    }
}

/** Groups open work per tailor so the home screen can be scanned person by person. */
export class TailorBoard {
    private constructor(
        readonly busy: TailorWorkload[],
        readonly idle: TailorWorkload[],
    ) {}

    static build(tailors: Tailor[], assignments: Assignment[], period: CurrentPeriod): TailorBoard {
        const openByTailor = new Map<number, ActiveAssignment[]>();

        for (const assignment of assignments.map((data) => new ActiveAssignment(data)).filter((item) => item.isOpen)) {
            openByTailor.set(assignment.tailorId, [...(openByTailor.get(assignment.tailorId) ?? []), assignment]);
        }

        const workload = (tailorId: number, name: string) =>
            new TailorWorkload(tailorId, name, openByTailor.get(tailorId) ?? [], period.wageFor(tailorId), period.qtyFor(tailorId));

        const busy = [...openByTailor.entries()].map(([tailorId, list]) => workload(tailorId, list[0].tailorName));
        const idle = tailors.filter((tailor) => tailor.is_active !== false && !openByTailor.has(tailor.id)).map((tailor) => workload(tailor.id, tailor.name));

        return new TailorBoard(TailorBoard.byName(busy), TailorBoard.byName(idle));
    }

    workloadOf(tailorId: number): TailorWorkload | undefined {
        return [...this.busy, ...this.idle].find((workload) => workload.tailorId === tailorId);
    }

    get openAssignmentCount(): number {
        return this.busy.reduce((total, workload) => total + workload.assignments.length, 0);
    }

    get queueQty(): number {
        return this.busy.reduce((total, workload) => total + workload.remainingQty, 0);
    }

    private static byName(workloads: TailorWorkload[]): TailorWorkload[] {
        return [...workloads].sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }
}
