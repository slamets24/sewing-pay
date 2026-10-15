import type { PayrollPeriod } from '@/types';
import { PayrollSlot } from './payroll-slot';

export type PeriodStage = 'created' | 'generated' | 'locked' | 'paid';

/** A payroll period and where it stands in the create → generate → lock → pay flow. */
export class PayrollPeriodRecord {
    static readonly stages: { key: PeriodStage; label: string }[] = [
        { key: 'created', label: 'Dibuat' },
        { key: 'generated', label: 'Slip dibuat' },
        { key: 'locked', label: 'Dikunci' },
        { key: 'paid', label: 'Dibayar' },
    ];

    readonly slot: PayrollSlot;

    constructor(readonly data: PayrollPeriod) {
        this.slot = PayrollSlot.containingIsoDate(data.starts_at);
    }

    get stage(): PeriodStage {
        if (this.data.status === 'paid') return 'paid';
        if (this.data.status === 'locked') return 'locked';

        return this.data.generated_at ? 'generated' : 'created';
    }

    get stageIndex(): number {
        return PayrollPeriodRecord.stages.findIndex((stage) => stage.key === this.stage);
    }

    get canGenerate(): boolean {
        return this.data.status === 'draft';
    }

    get canLock(): boolean {
        return this.data.status === 'draft' && this.data.generated_at !== null;
    }

    get canExport(): boolean {
        return this.data.generated_at !== null;
    }

    get nextStepHint(): string {
        switch (this.stage) {
            case 'created':
                return 'Generate slip dari qty selesai di periode ini.';
            case 'generated':
                return 'Cek slip, lalu kunci periode supaya bisa dibayar.';
            case 'locked':
                return 'Tandai slip dibayar di daftar slip. Periode selesai saat semua slip dibayar.';
            case 'paid':
                return 'Semua slip periode ini sudah dibayar.';
        }
    }
}
