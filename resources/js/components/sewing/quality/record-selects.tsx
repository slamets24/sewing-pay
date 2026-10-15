import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RevisionTarget } from '@/domain/quality/revision-report-draft';
import { formatIdr } from '@/lib/format';
import type { RevisionPartRecord, TailorRecord } from '@/types/sewing';

const ITEM_CLASS = 'py-2.5 text-base';

type TailorSelectProps = {
    id?: string;
    tailors: Array<Pick<TailorRecord, 'id' | 'name' | 'code' | 'type'>>;
    value: number | null;
    onChange: (tailorId: number) => void;
    /** Shown when the current tailor is no longer in the active list. */
    fallback?: { id: number; name: string };
    disabled?: boolean;
    'aria-label'?: string;
};

export function TailorSelect({ id, tailors, value, onChange, fallback, disabled, ...props }: TailorSelectProps) {
    const missing = fallback && !tailors.some((tailor) => tailor.id === fallback.id) ? fallback : null;

    return (
        <Select value={value === null ? '' : String(value)} onValueChange={(next) => onChange(Number(next))} disabled={disabled}>
            <SelectTrigger id={id} className="w-full" aria-label={props['aria-label']}>
                <SelectValue placeholder="Pilih penjahit" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {missing && (
                        <SelectItem value={String(missing.id)} className={ITEM_CLASS}>
                            {missing.name}
                        </SelectItem>
                    )}
                    {tailors.map((tailor) => (
                        <SelectItem key={tailor.id} value={String(tailor.id)} className={ITEM_CLASS}>
                            {tailor.code ? `${tailor.name} (${tailor.code})` : tailor.name}
                            {tailor.type === 'makloon' ? ' · Makloon' : ''}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}

type RevisionPartSelectProps = {
    id?: string;
    parts: RevisionPartRecord[];
    value: number | null;
    onChange: (partId: number) => void;
    invalid?: boolean;
    'aria-label'?: string;
};

export function RevisionPartSelect({ id, parts, value, onChange, invalid, ...props }: RevisionPartSelectProps) {
    return (
        <Select value={value === null ? '' : String(value)} onValueChange={(next) => onChange(Number(next))} disabled={parts.length === 0}>
            <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined} aria-label={props['aria-label']}>
                <SelectValue placeholder={parts.length === 0 ? 'Daftar bagian revisi masih kosong' : 'Pilih bagian yang diganti'} />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {parts.map((part) => (
                        <SelectItem key={part.id} value={String(part.id)} className={ITEM_CLASS}>
                            {part.name} · {formatIdr(part.price)}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}

type RevisionTargetSelectProps = {
    id?: string;
    targets: RevisionTarget[];
    value: string | null;
    onChange: (target: RevisionTarget) => void;
    emptyLabel: string;
    placeholder: string;
    invalid?: boolean;
};

/** Goods a revision can be about (sent to QC, or still being sewn), grouped per tailor. */
export function RevisionTargetSelect({ id, targets, value, onChange, emptyLabel, placeholder, invalid }: RevisionTargetSelectProps) {
    const byTailor = new Map<string, RevisionTarget[]>();

    for (const target of targets) {
        byTailor.set(target.tailorName, [...(byTailor.get(target.tailorName) ?? []), target]);
    }

    const groups = [...byTailor.entries()].sort(([a], [b]) => a.localeCompare(b, 'id'));

    return (
        <Select
            value={value ?? ''}
            onValueChange={(next) => {
                const target = targets.find((candidate) => candidate.key === next);

                if (target) onChange(target);
            }}
            disabled={targets.length === 0}
        >
            <SelectTrigger id={id} className="h-auto min-h-11 w-full whitespace-normal" aria-invalid={invalid || undefined}>
                <SelectValue placeholder={targets.length === 0 ? emptyLabel : placeholder} />
            </SelectTrigger>
            <SelectContent>
                {groups.map(([tailorName, tailorTargets]) => (
                    <SelectGroup key={tailorName}>
                        <SelectLabel className="text-sm font-bold text-foreground">{tailorName}</SelectLabel>
                        {tailorTargets.map((target) => (
                            <SelectItem key={target.key} value={target.key} className={ITEM_CLASS}>
                                {target.title} · {target.detail.split(' · ')[0]}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                ))}
            </SelectContent>
        </Select>
    );
}
