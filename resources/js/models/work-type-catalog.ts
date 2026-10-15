import { formatIdr } from '@/lib/format';
import type { SelectOption, WorkType } from '@/types';

/** The tariffs an admin may pick for new work: active work types only. */
export class WorkTypeCatalog {
    private readonly workTypes: WorkType[];

    constructor(workTypes: WorkType[]) {
        this.workTypes = workTypes.filter((workType) => workType.is_active !== false);
    }

    get isEmpty(): boolean {
        return this.workTypes.length === 0;
    }

    has(id: number | string | null): boolean {
        return id !== null && id !== '' && this.workTypes.some((workType) => String(workType.id) === String(id));
    }

    options(): SelectOption[] {
        return this.workTypes.map((workType) => ({
            value: String(workType.id),
            label: `${workType.name} - ${formatIdr(workType.rate_amount ?? 0)}`,
        }));
    }
}
