import type { Tone } from '@/lib/tone';
import type { RevisionPartRecord } from '@/types/sewing';

export type RevisionPartFormData = {
    name: string;
    price: number;
    material_type: string;
    is_active: boolean;
};

const DEFAULT_MATERIAL = 'print';

/** Shapes the add/edit form for one entry of the material-revision price list. */
export class RevisionPartForm {
    static blank(): RevisionPartFormData {
        return { name: '', price: 0, material_type: DEFAULT_MATERIAL, is_active: true };
    }

    static fromRecord(part: RevisionPartRecord): RevisionPartFormData {
        return { name: part.name, price: part.price, material_type: part.material_type, is_active: part.is_active ?? true };
    }

    static payload(data: RevisionPartFormData): RevisionPartFormData {
        return { ...data, name: data.name.trim(), material_type: data.material_type.trim() || DEFAULT_MATERIAL };
    }
}

/** Material kinds are free text; these are the quick picks offered next to the field. */
export class MaterialTypes {
    static suggestions(parts: RevisionPartRecord[]): string[] {
        const seen = new Set<string>([DEFAULT_MATERIAL, 'polos']);

        parts.forEach((part) => {
            const type = part.material_type.trim().toLowerCase();

            if (type) seen.add(type);
        });

        return [...seen];
    }

    static tone(type: string): Tone {
        return type.trim().toLowerCase() === DEFAULT_MATERIAL ? 'qc' : 'neutral';
    }
}
