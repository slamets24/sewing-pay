import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DeliveryGroups, type DeliveryGroup, type DeliveryGrouping } from '@/domain/quality/delivery-groups';
import type { DeliverySelection } from '@/domain/quality/delivery-selection';
import { formatDateTime, variantLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DeliveryRecord } from '@/types/sewing';
import { Square, SquareCheckBig } from 'lucide-react';

type DeliveryPickListProps = {
    groups: DeliveryGroup[];
    grouping: DeliveryGrouping;
    selection: DeliverySelection;
    onChange: (selection: DeliverySelection) => void;
};

/** Unshipped deliveries as big tick rows, grouped per tailor or per WO. */
export function DeliveryPickList({ groups, grouping, selection, onChange }: DeliveryPickListProps) {
    return (
        <div className="flex flex-col gap-4">
            {groups.map((group) => (
                <PickGroup key={group.key} group={group} grouping={grouping} selection={selection} onChange={onChange} />
            ))}
        </div>
    );
}

function PickGroup({ group, grouping, selection, onChange }: Omit<DeliveryPickListProps, 'groups'> & { group: DeliveryGroup }) {
    const allPicked = selection.covers(group.ids);
    const pickedQty = selection.qtyIn(group.deliveries);

    return (
        <div className="overflow-hidden rounded-lg border">
            <div className="flex flex-wrap items-center gap-3 border-b bg-muted/60 px-3 py-2.5">
                <div className="min-w-0 flex-1 basis-44">
                    <h3 className="font-display text-lg font-bold uppercase">{group.title}</h3>
                    <p className="text-sm text-muted-foreground">
                        {group.summary}
                        {pickedQty > 0 && <span className="font-semibold text-foreground"> · {pickedQty} pcs dipilih</span>}
                    </p>
                </div>
                <SelectAllButton picked={allPicked} onClick={() => onChange(selection.withMany(group.ids, !allPicked))} />
            </div>
            <ul className="divide-y">
                {group.deliveries.map((delivery) => (
                    <li key={delivery.id}>
                        <PickRow delivery={delivery} grouping={grouping} checked={selection.has(delivery.id)} onToggle={() => onChange(selection.toggle(delivery.id))} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** "Pilih semua" / "Batal pilih semua" toggle used for one group or the whole list. */
export function SelectAllButton({
    picked,
    onClick,
    pickLabel = 'Pilih semua',
    unpickLabel = 'Batal pilih',
}: {
    picked: boolean;
    onClick: () => void;
    pickLabel?: string;
    unpickLabel?: string;
}) {
    return (
        <Button type="button" variant="outline" aria-pressed={picked} onClick={onClick}>
            {picked ? <SquareCheckBig aria-hidden /> : <Square aria-hidden />}
            {picked ? unpickLabel : pickLabel}
        </Button>
    );
}

function PickRow({ delivery, grouping, checked, onToggle }: { delivery: DeliveryRecord; grouping: DeliveryGrouping; checked: boolean; onToggle: () => void }) {
    const id = `pick-delivery-${delivery.id}`;
    const variant = variantLabel(delivery.color, delivery.size);
    const meta = [`WO ${delivery.work_order_number}`, grouping === 'work_order' ? DeliveryGroups.tailorLabel(delivery) : null, `Setor ${formatDateTime(delivery.delivered_at)}`];

    return (
        <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors hover:bg-accent/70', checked && 'bg-primary/15 hover:bg-primary/20')}>
            <Checkbox id={id} checked={checked} onCheckedChange={onToggle} className="mt-0.5 size-7 border-2 [&_svg]:size-5" />
            <div className="min-w-0 flex-1">
                <p className="text-lg leading-tight font-semibold">{delivery.article_name}</p>
                {variant && <p className="text-base">{variant}</p>}
                <p className="text-sm text-muted-foreground">{meta.filter(Boolean).join(' · ')}</p>
                {!delivery.barcode_value && (
                    <ToneBadge tone="revision" className="mt-1.5">
                        Belum ada barcode
                    </ToneBadge>
                )}
            </div>
            <span className="shrink-0 text-right">
                <span className="block font-display text-3xl leading-none font-bold tabular">{delivery.qty}</span>
                <span className="text-sm text-muted-foreground">pcs</span>
            </span>
        </label>
    );
}
