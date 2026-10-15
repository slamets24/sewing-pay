import { FormField } from '@/components/form-field';
import { QtyStepper } from '@/components/sewing/qty-stepper';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { RevisionReportDraft, RevisionTarget, type RevisionSource } from '@/domain/quality/revision-report-draft';
import type { DeliveryRecord, PickupItemRecord, RevisionPartRecord, RevisionType, TailorRecord } from '@/types/sewing';
import { Plus, Save, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { RevisionPartSelect, RevisionTargetSelect, TailorSelect } from './record-selects';
import { SegmentedChoice } from './segmented-choice';
import { looseErrors, useDraftPost } from './use-draft-post';

const SOURCE_OPTIONS: { value: RevisionSource; label: string }[] = [
    { value: 'qc', label: 'Laporan dari QC' },
    { value: 'sewing', label: 'Ketemu saat dijahit' },
];

const SOURCE_HINT: Record<RevisionSource, string> = {
    qc: 'Barang sudah dikirim ke QC, lalu QC melaporkan revisinya.',
    sewing: 'Penjahit menemukan masalah sebelum barang selesai dijahit.',
};

const TYPE_OPTIONS: { value: RevisionType; label: string }[] = [
    { value: 'material', label: 'Revisi bahan' },
    { value: 'sewing', label: 'Revisi jahit' },
];

const TYPE_HINT: Record<RevisionType, string> = {
    material: 'Ganti bagian (print) yang cacat. Dibayar per bagian dan boleh dikerjakan penjahit lain. Statusnya mulai dari "Menunggu bahan".',
    sewing: 'Jahitan perlu dibetulkan. Gratis, dikerjakan penjahit yang sama.',
};

const RETURN_OPTIONS: { value: 'keep' | 'return'; label: string }[] = [
    { value: 'keep', label: 'Tetap di penjahit' },
    { value: 'return', label: 'Dikembalikan ke gudang' },
];

const FIELD_KEYS = new Set(['sewing_delivery_id', 'pickup_item_id', 'work_order_item_id', 'revision_part_id', 'tailor_id', 'qty', 'notes', 'return_to_warehouse']);

type RevisionReportSheetProps = {
    shippedDeliveries: DeliveryRecord[];
    sewingItems: PickupItemRecord[];
    revisionParts: RevisionPartRecord[];
    tailors: TailorRecord[];
    /** Open straight away for this item (from the "Cacat bahan" button on the Setor page). */
    preset?: PickupItemRecord | null;
};

/** "Catat revisi": what QC reported back, or a defect the tailor found while still sewing. */
export function RevisionReportSheet({ shippedDeliveries, sewingItems, revisionParts, tailors, preset = null }: RevisionReportSheetProps) {
    const [open, setOpen] = useState(preset !== null);
    const [draft, setDraft] = useState(() => (preset ? RevisionReportDraft.forPickupItem(preset) : RevisionReportDraft.start()));
    const { post, errors, processing, clearErrors } = useDraftPost();

    const targets = useMemo(
        () => (draft.source === 'qc' ? shippedDeliveries.map(RevisionTarget.fromDelivery) : sewingItems.map(RevisionTarget.fromPickupItem)),
        [draft.source, shippedDeliveries, sewingItems],
    );

    const changeOpen = (next: boolean) => {
        if (!next) clearErrors();
        setOpen(next);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (!draft.canSubmit) return;

        post(route('revisions.store'), draft.toPayload(), () => {
            setDraft(RevisionReportDraft.start(draft.type, draft.source));
            setOpen(false);
        });
    };

    const targetError = errors.sewing_delivery_id ?? errors.pickup_item_id ?? errors.work_order_item_id;

    return (
        <Sheet open={open} onOpenChange={changeOpen}>
            <SheetTrigger asChild>
                <Button type="button" size="lg" className="w-full lg:w-fit">
                    <Plus aria-hidden />
                    Catat revisi
                </Button>
            </SheetTrigger>
            <SheetContent side="right" showCloseButton={false} className="w-full gap-0 overflow-y-auto sm:max-w-lg">
                <SheetHeader className="border-b">
                    <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                            <SheetTitle className="font-display text-2xl font-bold uppercase">Catat revisi</SheetTitle>
                            <SheetDescription className="text-base">{SOURCE_HINT[draft.source]}</SheetDescription>
                        </div>
                        <SheetClose asChild>
                            <Button type="button" variant="outline">
                                <X aria-hidden />
                                Tutup
                            </Button>
                        </SheetClose>
                    </div>
                </SheetHeader>

                <form onSubmit={submit} className="flex flex-col gap-5 p-4">
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium">Dari mana?</span>
                        <SegmentedChoice options={SOURCE_OPTIONS} value={draft.source} onChange={(source) => setDraft(draft.withSource(source))} label="Sumber revisi" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium">Jenis revisi</span>
                        <SegmentedChoice options={TYPE_OPTIONS} value={draft.type} onChange={(type) => setDraft(draft.withType(type))} label="Jenis revisi" />
                        <p className="text-sm text-muted-foreground">{TYPE_HINT[draft.type]}</p>
                    </div>

                    <FormField label={draft.source === 'qc' ? 'Barang yang dilaporkan QC' : 'Barang yang sedang dijahit'} htmlFor="revision-target" error={targetError}>
                        <RevisionTargetSelect
                            id="revision-target"
                            targets={targets}
                            value={draft.target?.key ?? null}
                            onChange={(target) => setDraft(draft.withTarget(target))}
                            emptyLabel={draft.source === 'qc' ? 'Belum ada barang yang dikirim ke QC' : 'Tidak ada barang yang sedang dijahit'}
                            placeholder="Pilih barang"
                            invalid={!!targetError}
                        />
                    </FormField>
                    {draft.target && (
                        <div className="-mt-3 rounded-lg border bg-muted/60 px-3 py-2">
                            <p className="text-base font-semibold">{draft.target.title}</p>
                            <p className="text-sm text-muted-foreground">{draft.target.detail}</p>
                        </div>
                    )}

                    {draft.isMaterial && (
                        <FormField label="Bagian yang diganti" htmlFor="revision-part" error={errors.revision_part_id}>
                            <RevisionPartSelect id="revision-part" parts={revisionParts} value={draft.partId} onChange={(partId) => setDraft(draft.withPart(partId))} invalid={!!errors.revision_part_id} />
                        </FormField>
                    )}

                    <FormField label="Jumlah" htmlFor="revision-qty" error={errors.qty}>
                        <QtyStepper id="revision-qty" value={draft.qty} onChange={(qty) => setDraft(draft.withQty(qty))} min={1} max={draft.maxQty} label="jumlah revisi" />
                    </FormField>

                    {draft.canReturnToWarehouse && (
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium">Barangnya sekarang di mana?</span>
                            <SegmentedChoice
                                options={RETURN_OPTIONS}
                                value={draft.returnToWarehouse ? 'return' : 'keep'}
                                onChange={(choice) => setDraft(draft.withReturnToWarehouse(choice === 'return'))}
                                label="Posisi barang"
                            />
                            <p className="text-sm text-muted-foreground">
                                {draft.returnToWarehouse
                                    ? 'Barang keluar dari pegangan penjahit dan ditahan di gudang. Begitu status revisi jadi "Bahan datang", barang bisa diambil lagi.'
                                    : 'Penjahit tetap memegang barangnya dan melanjutkan setelah bahan pengganti datang.'}
                            </p>
                        </div>
                    )}

                    <FormField label="Dikerjakan oleh" htmlFor="revision-tailor" error={errors.tailor_id}>
                        <TailorSelect id="revision-tailor" tailors={tailors} value={draft.tailorId} onChange={(tailorId) => setDraft(draft.withTailor(tailorId))} />
                    </FormField>

                    <FormField label="Catatan (boleh kosong)" htmlFor="revision-notes" error={errors.notes}>
                        <Textarea id="revision-notes" value={draft.notes} onChange={(event) => setDraft(draft.withNotes(event.target.value))} maxLength={500} rows={2} className="text-base md:text-base" />
                    </FormField>

                    {looseErrors(errors, (key) => FIELD_KEYS.has(key)).map((message) => (
                        <Alert key={message} variant="destructive">
                            <AlertDescription className="text-base">{message}</AlertDescription>
                        </Alert>
                    ))}
                    {errors.return_to_warehouse && (
                        <Alert variant="destructive">
                            <AlertDescription className="text-base">{errors.return_to_warehouse}</AlertDescription>
                        </Alert>
                    )}

                    {draft.blocker && <p className="text-sm text-muted-foreground">{draft.blocker}</p>}

                    <div className="flex flex-col gap-2 sm:flex-row-reverse">
                        <Button type="submit" size="lg" disabled={!draft.canSubmit || processing} className="sm:flex-1">
                            <Save aria-hidden />
                            {processing ? 'Menyimpan…' : 'Simpan revisi'}
                        </Button>
                        <SheetClose asChild>
                            <Button type="button" variant="outline" size="lg">
                                Batal
                            </Button>
                        </SheetClose>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
