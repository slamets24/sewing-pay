import { FormField } from '@/components/form-field';
import { QtyStepper } from '@/components/sewing/qty-stepper';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { formatIdr, variantLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { floorActions, FloorActions } from '@/services/floor-actions';
import type { PickupItemRecord, RevisionPartRecord, RevisionRecord, TailorRecord } from '@/types/sewing';
import { useForm } from '@inertiajs/react';
import {
    ArrowLeftRight,
    Check,
    Package,
    Scissors,
    Shirt,
    Sparkles,
    TriangleAlert,
    Warehouse,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

/**
 * Pop-up / Sheet to report defect right at the Quick Desk:
 * Lets the operator choose whether defect is material or sewing,
 * and CRITICALLY: whether the defective goods are handed back to warehouse (gudang)
 * or kept with the tailor while waiting for replacement parts.
 */
export function ReportDefectSheet({
    item,
    revisionParts,
    trigger,
}: {
    item: PickupItemRecord;
    revisionParts: RevisionPartRecord[];
    trigger: ReactNode;
}) {
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        type: 'material' as 'material' | 'sewing',
        found_at: 'sewing',
        pickup_item_id: item.id,
        qty: 1,
        return_to_warehouse: true,
        revision_part_id: revisionParts[0]?.id ? String(revisionParts[0].id) : '',
        notes: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('revisions.store'), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('Laporan cacat / revisi berhasil dicatat.');
                reset();
                setOpen(false);
            },
            onError: (errs) => toast.error(FloorActions.firstError(errs)),
        });
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="text-xl font-bold flex items-center gap-2 text-rose-600">
                        <TriangleAlert className="size-5" />
                        Lapor Cacat Jahitan / Bahan
                    </SheetTitle>
                    <SheetDescription className="text-sm">
                        Barang: <strong>{item.article_name}</strong> ({variantLabel(item.color, item.size)}) · WO {item.work_order_number}
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-1 py-3 text-sm">
                    {/* 1. JENIS CACAT */}
                    <FormField label="Jenis Masalah / Cacat">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setData('type', 'material')}
                                className={cn(
                                    'flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all',
                                    data.type === 'material'
                                        ? 'border-primary bg-primary/10 shadow-xs'
                                        : 'border-border/60 hover:bg-muted/40',
                                )}
                            >
                                <div className="flex items-center gap-1.5 font-bold text-foreground">
                                    <Scissors className="size-4 text-primary" />
                                    Cacat Bahan
                                </div>
                                <span className="mt-1 rounded bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                                    Ada upah perbaikan
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setData('type', 'sewing')}
                                className={cn(
                                    'flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all',
                                    data.type === 'sewing'
                                        ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                                        : 'border-border/60 hover:bg-muted/40',
                                )}
                            >
                                <div className="flex items-center gap-1.5 font-bold text-foreground">
                                    <Shirt className="size-4 text-amber-600" />
                                    Cacat Jahitan
                                </div>
                                <span className="mt-1 rounded bg-muted px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground">
                                    Tanggung jawab penjahit
                                </span>
                            </button>
                        </div>
                    </FormField>

                    {/* 2. JUMLAH CACAT */}
                    <FormField label={`Jumlah Potongan Cacat (Maksimal ${item.remaining_qty} pcs)`}>
                        <div className="flex items-center gap-3">
                            <QtyStepper
                                value={data.qty}
                                min={1}
                                max={item.remaining_qty}
                                onChange={(val) => setData('qty', val)}
                                label="Jumlah pcs cacat"
                            />
                            <span className="text-xs text-muted-foreground">
                                Dari sisa <strong>{item.remaining_qty} pcs</strong> di tangan
                            </span>
                        </div>
                    </FormField>

                    {/* 3. JIKA CACAT BAHAN: PILIH BAGIAN & STATUS PENANGANAN FISIK BARANG */}
                    {data.type === 'material' && (
                        <>
                            <FormField label="Bagian yang Rusak / Butuh Diganti" error={errors.revision_part_id}>
                                <select
                                    value={data.revision_part_id}
                                    onChange={(e) => setData('revision_part_id', e.target.value)}
                                    className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-2xs focus:border-primary focus:outline-none"
                                >
                                    <option value="">-- Pilih Bagian --</option>
                                    {revisionParts.map((part) => (
                                        <option key={part.id} value={part.id}>
                                            {part.name} ({part.material_type}) - Upah {formatIdr(part.price)}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            {/* PILIHAN KUNCI: KEMBALIKAN KE GUDANG ATAU DISIMPAN PENJAHIT */}
                            <FormField label="Status Penanganan Fisik Barang Cacat:">
                                <div className="flex flex-col gap-2">
                                    <label
                                        className={cn(
                                            'flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all',
                                            data.return_to_warehouse
                                                ? 'border-emerald-600 bg-emerald-500/10 shadow-xs'
                                                : 'border-border/60 hover:bg-muted/30',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="return_to_warehouse"
                                            checked={data.return_to_warehouse}
                                            onChange={() => setData('return_to_warehouse', true)}
                                            className="mt-1 size-4 text-emerald-600"
                                        />
                                        <div className="flex-1">
                                            <p className="font-bold text-foreground flex items-center gap-1.5">
                                                <Warehouse className="size-4 text-emerald-600" />
                                                Kembalikan ke Loket / Gudang
                                            </p>
                                        </div>
                                    </label>

                                    <label
                                        className={cn(
                                            'flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all',
                                            !data.return_to_warehouse
                                                ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                                                : 'border-border/60 hover:bg-muted/30',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="return_to_warehouse"
                                            checked={!data.return_to_warehouse}
                                            onChange={() => setData('return_to_warehouse', false)}
                                            className="mt-1 size-4 text-amber-600"
                                        />
                                        <div className="flex-1">
                                            <p className="font-bold text-foreground flex items-center gap-1.5">
                                                <Package className="size-4 text-amber-600" />
                                                Masih Disimpan oleh Penjahit
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </FormField>
                        </>
                    )}

                    {/* 4. CATATAN KERUSAKAN */}
                    <FormField label="Catatan Kerusakan (Opsional)">
                        <Textarea
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            placeholder="Contoh: Kain bolong di dekat jahitan kerah depan..."
                            rows={3}
                            className="rounded-xl text-sm shadow-2xs"
                        />
                    </FormField>

                    <SheetFooter className="mt-auto pt-3">
                        <Button
                            type="submit"
                            size="lg"
                            disabled={processing}
                            className="w-full rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700 shadow-md transition-all active:scale-95"
                        >
                            <Check className="size-4 mr-2" />
                            Simpan Laporan Cacat ({data.qty} pcs)
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

/**
 * Reassign Tailor Sheet:
 * Allows transferring a pending revision to another tailor
 * (e.g. if the original tailor is absent, sick, or another tailor at the desk takes it over).
 */
export function ReassignRevisionSheet({
    revision,
    tailors,
    trigger,
    selectedTailor,
}: {
    revision: RevisionRecord;
    tailors: TailorRecord[];
    trigger: ReactNode;
    selectedTailor: TailorRecord | null;
}) {
    const [open, setOpen] = useState(false);
    const [targetTailorId, setTargetTailorId] = useState<number>(() => revision.tailor_id);
    const [busy, setBusy] = useState(false);

    const reassignTo = (tailorId: number) => {
        floorActions.send(
            'post',
            route('revisions.reassign', revision.id),
            { tailor_id: tailorId },
            {
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                onSuccess: () => setOpen(false),
            },
        );
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                        <ArrowLeftRight className="size-5 text-primary" />
                        Alihkan Pengerjaan Revisi
                    </SheetTitle>
                    <SheetDescription className="text-sm">
                        Barang: <strong>{revision.article_name}</strong> ({variantLabel(revision.color, revision.size)}) · {revision.qty} pcs
                    </SheetDescription>
                </SheetHeader>

                <div className="flex flex-1 flex-col gap-4 py-4 text-sm">
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Penjahit Saat Ini:</p>
                        <p className="font-bold text-base text-foreground mt-0.5">{revision.tailor_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Status revisi: <ToneBadge tone="other">{revision.status_label}</ToneBadge>
                        </p>
                    </div>

                    {/* Quick 1-Click option if selected tailor at desk is different from current tailor */}
                    {selectedTailor && selectedTailor.id !== revision.tailor_id && (
                        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 flex flex-col gap-2">
                            <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                                <Sparkles className="size-4" />
                                Penjahit di Meja Loket Saat Ini:
                            </p>
                            <p className="text-base font-black text-foreground">{selectedTailor.name}</p>
                            <Button
                                type="button"
                                onClick={() => reassignTo(selectedTailor.id)}
                                disabled={busy}
                                className="mt-1 h-9.5 rounded-xl font-bold bg-primary text-primary-foreground shadow-sm active:scale-95"
                            >
                                <Check className="size-4 mr-1.5" />
                                Serahkan ke {selectedTailor.name}
                            </Button>
                        </div>
                    )}

                    {/* Select from other active tailors */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Atau Pilih Penjahit Lain:
                        </label>
                        <select
                            value={targetTailorId}
                            onChange={(e) => setTargetTailorId(Number(e.target.value))}
                            className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm shadow-2xs focus:border-primary focus:outline-none"
                        >
                            {tailors.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} {t.code ? `(${t.code})` : ''} {t.id === revision.tailor_id ? '— [Saat Ini]' : ''}
                                </option>
                            ))}
                        </select>

                        <Button
                            type="button"
                            onClick={() => reassignTo(targetTailorId)}
                            disabled={busy || targetTailorId === revision.tailor_id}
                            variant="secondary"
                            className="mt-2 h-10 rounded-xl font-bold active:scale-95"
                        >
                            Simpan Pengalihan Penjahit
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
