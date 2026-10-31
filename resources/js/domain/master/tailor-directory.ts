import type { Tone } from '@/lib/tone';
import type { TailorRecord, TailorType } from '@/types/sewing';
import { TextSearch } from './text-search';

export type TailorFormData = {
    code: string;
    name: string;
    type: TailorType;
    whatsapp_number: string;
    address: string;
    notes: string;
    is_active: boolean;
};

const TYPE_TONES: Record<TailorType, Tone> = { internal: 'ready', makloon: 'qc' };

/** The tailor list as the owner browses it: search by name or code, plus a few counts. */
export class TailorDirectory {
    constructor(private readonly tailors: TailorRecord[]) {}

    search(query: string): TailorRecord[] {
        const search = new TextSearch(query);

        return this.tailors.filter((tailor) => search.matches(tailor.name, tailor.code));
    }

    get activeCount(): number {
        return this.tailors.filter((tailor) => tailor.is_active).length;
    }

    get inactiveCount(): number {
        return this.tailors.length - this.activeCount;
    }

    countOfType(type: TailorType): number {
        return this.tailors.filter((tailor) => tailor.is_active && tailor.type === type).length;
    }

    static typeTone(type: TailorType): Tone {
        return TYPE_TONES[type];
    }

    static readonly typeOptions: { value: TailorType; label: string }[] = [
        { value: 'internal', label: 'Internal' },
        { value: 'makloon', label: 'Makloon' },
    ];
}

/** Shapes the add/edit tailor form from and to the server record. */
export class TailorForm {
    static blank(nextCode: string): TailorFormData {
        return { code: nextCode, name: '', type: 'internal', whatsapp_number: '', address: '', notes: '', is_active: true };
    }

    static fromRecord(tailor: TailorRecord): TailorFormData {
        return {
            code: tailor.code ?? '',
            name: tailor.name,
            type: tailor.type,
            whatsapp_number: tailor.whatsapp_number ?? '',
            address: tailor.address ?? '',
            notes: tailor.notes ?? '',
            is_active: tailor.is_active,
        };
    }

    static payload(data: TailorFormData): TailorFormData {
        return {
            ...data,
            code: data.code.trim(),
            name: data.name.trim(),
            whatsapp_number: data.whatsapp_number.trim(),
        };
    }
}
