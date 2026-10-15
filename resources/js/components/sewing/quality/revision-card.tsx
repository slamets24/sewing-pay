import { ConfirmButton } from '@/components/confirm-button';
import { FormField } from '@/components/form-field';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { RevisionView } from '@/domain/quality/revision-view';
import { formatDateTime, formatIdr, variantLabel } from '@/lib/format';
import { ToneStyle } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { floorActions } from '@/services/floor-actions';
import type { RevisionRecord, TailorRecord } from '@/types/sewing';
import { ArrowRight, Lock, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { TailorSelect } from './record-selects';

/**
 * One revision with its next step. Re-mount it (via `key`) when the server changes its status or tailor,
 * so the "Dikerjakan oleh" choice starts from the saved value again.
 */
export function RevisionCard({ revision, tailors }: { revision: RevisionRecord; tailors: TailorRecord[] }) {
    const [tailorId, setTailorId] = useState(revision.tailor_id);
    const [busy, setBusy] = useState(false);
    const typeTone = RevisionView.typeTone(revision.type);
    const variant = variantLabel(revision.color, revision.size);
    const hooks = { onStart: () => setBusy(true), onFinish: () => setBusy(false) };
    const canAdvance = revision.next_status_label !== null;

    const advance = () => floorActions.send('post', route('revisions.advance', revision.id), revision.can_change_tailor ? { tailor_id: tailorId } : {}, hooks);
    const remove = () => floorActions.send('delete', route('revisions.destroy', revision.id), {}, hooks);

    return (
        <article className={cn('flex flex-col gap-3 rounded-lg border border-t-4 bg-card p-4 shadow-xs', ToneStyle.topBorder(typeTone))}>
            <div className="flex flex-wrap items-center gap-2">
                <ToneBadge tone={typeTone}>{revision.type_label}</ToneBadge>
                <ToneBadge tone={ToneStyle.forRevisionStatus(revision.status)}>{revision.status_label}</ToneBadge>
                <span className="text-sm text-muted-foreground">{revision.found_at_label}</span>
                {revision.is_holding_stock && <ToneBadge tone="other">Barang ditahan di gudang</ToneBadge>}
                {revision.returned_to_warehouse && !revision.is_holding_stock && <ToneBadge tone="ready">Barang sudah bisa diambil lagi</ToneBadge>}
            </div>

            <div>
                <h3 className="font-display text-xl leading-tight font-bold uppercase">{revision.article_name}</h3>
                <p className="text-base">{[variant, `WO ${revision.work_order_number}`].filter(Boolean).join(' · ')}</p>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {revision.part_name && <Fact label="Bagian" value={revision.material_type ? `${revision.part_name} (${revision.material_type})` : revision.part_name} />}
                <Fact label="Qty" value={`${revision.qty} pcs`} />
                <Fact label="Penjahit" value={revision.tailor_name} />
                <Fact
                    label="Upah revisi"
                    value={RevisionView.money(revision)}
                    hint={revision.type === 'material' && revision.rate > 0 ? `${formatIdr(revision.rate)} / pcs` : undefined}
                />
            </dl>

            {revision.notes && <p className="rounded-md bg-muted/70 px-3 py-2 text-base">Catatan: {revision.notes}</p>}

            <p className="text-sm text-muted-foreground">
                Dicatat {formatDateTime(revision.reported_at)}
                {revision.reported_by_name && ` oleh ${revision.reported_by_name}`}
                {revision.completed_at && ` · Selesai ${formatDateTime(revision.completed_at)}`}
            </p>

            {(canAdvance || !revision.is_on_slip) && (
                <div className="flex flex-col gap-3 border-t pt-3">
                    {canAdvance && revision.can_change_tailor && (
                        <FormField label="Dikerjakan oleh" htmlFor={`revision-tailor-${revision.id}`}>
                            <TailorSelect
                                id={`revision-tailor-${revision.id}`}
                                tailors={tailors}
                                value={tailorId}
                                onChange={setTailorId}
                                fallback={{ id: revision.tailor_id, name: revision.tailor_name }}
                                disabled={busy}
                            />
                        </FormField>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {canAdvance && (
                            <Button type="button" onClick={advance} disabled={busy} className="flex-1 basis-56">
                                <ArrowRight aria-hidden />
                                Tandai: {revision.next_status_label}
                            </Button>
                        )}
                        {!revision.is_on_slip && (
                            <ConfirmButton onConfirm={remove} confirmLabel="Ketuk lagi untuk hapus" disabled={busy} className="flex-1 basis-32" idleClassName="text-destructive hover:text-destructive">
                                <Trash2 aria-hidden />
                                Hapus
                            </ConfirmButton>
                        )}
                    </div>
                </div>
            )}

            {revision.is_on_slip && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Lock className="size-4" aria-hidden />
                    Sudah masuk slip gaji, tidak bisa dihapus.
                </p>
            )}
        </article>
    );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-base font-semibold break-words">
                {value}
                {hint && <span className="block text-sm font-normal text-muted-foreground">{hint}</span>}
            </dd>
        </div>
    );
}
