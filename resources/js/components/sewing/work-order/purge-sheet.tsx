import { FormField } from '@/components/form-field';
import { FormSheet } from '@/components/sewing/master/form-sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { floorActions } from '@/services/floor-actions';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';

export type PurgePreview = {
    counts: { items: number; hancaan: number; cutting: number; pickup_qty: number; deliveries: number; delivered_qty: number; revisions: number };
    blockers: string[];
};

type PurgeSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workOrderId: number;
    number: string;
    fromPacking: boolean;
    preview: PurgePreview;
};

/** "Hapus total" WO yang sudah berjalan (Owner saja): butuh ketik nomor WO sebagai konfirmasi. Dibuka dari menu ⋯ di detail WO. */
export function PurgeWorkOrderSheet({ open, onOpenChange: setOpen, workOrderId, number, fromPacking, preview }: PurgeSheetProps) {
    const form = useForm({ confirm_number: '' });
    const blocked = preview.blockers.length > 0;
    const { counts } = preview;

    const rows = [
        [`${counts.items} baris artikel`, counts.items],
        [`${counts.hancaan} catatan hancaan masuk gudang`, counts.hancaan],
        [`${counts.cutting} catatan cutting`, counts.cutting],
        [`${counts.pickup_qty} pcs ambilan penjahit`, counts.pickup_qty],
        [`${counts.deliveries} setoran (${counts.delivered_qty} pcs)`, counts.deliveries],
        [`${counts.revisions} catatan revisi`, counts.revisions],
    ].filter(([, value]) => Number(value) > 0);

    const submit = () =>
        form.delete(route('work-orders.purge', workOrderId), {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });

    return (
        <>
            <FormSheet
                open={open}
                onOpenChange={(next) => {
                    setOpen(next);
                    if (!next) form.reset();
                }}
                title={`Hapus total ${number}`}
                description="WO ini sudah berjalan. Semua riwayatnya ikut terhapus dan tidak bisa dikembalikan."
                submitLabel="Hapus total"
                processing={form.processing}
                destructive
                disabled={blocked || form.data.confirm_number.trim() !== number}
                onSubmit={submit}
            >
                {blocked ? (
                    <Alert variant="destructive">
                        <TriangleAlert />
                        <AlertDescription>
                            <ul className="list-disc space-y-1 pl-4">
                                {preview.blockers.map((blocker) => (
                                    <li key={blocker}>{blocker}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                            <p className="mb-1.5 font-semibold">Yang ikut terhapus:</p>
                            <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                                {rows.map(([label]) => (
                                    <li key={String(label)}>{label}</li>
                                ))}
                            </ul>
                            <p className="mt-2 text-xs text-muted-foreground">
                                Hitungan stok gudang, tanggungan penjahit, dan rekap ikut berubah. Gaji yang belum dibuat tidak lagi memuat setoran WO ini.
                            </p>
                        </div>
                        {fromPacking && (
                            <p className="text-sm text-muted-foreground">
                                WO ini dari Packing. Setelah dihapus, tombol <strong>Tarik dari Packing</strong> bisa memasukkannya lagi dari awal (reset).
                            </p>
                        )}
                        <FormField label={`Ketik ${number} untuk konfirmasi`} htmlFor="purge-confirm" error={form.errors.confirm_number ?? (form.errors as Record<string, string>).work_order}>
                            <Input
                                id="purge-confirm"
                                value={form.data.confirm_number}
                                onChange={(event) => form.setData('confirm_number', event.target.value)}
                                autoComplete="off"
                                placeholder={number}
                            />
                        </FormField>
                    </>
                )}
            </FormSheet>
        </>
    );
}

/** Hapus WO yang belum berjalan (belum ada barang masuk gudang). */
export function DeleteWorkOrderSheet({ open, onOpenChange, workOrderId, number }: { open: boolean; onOpenChange: (open: boolean) => void; workOrderId: number; number: string }) {
    const [processing, setProcessing] = useState(false);

    return (
        <FormSheet
            open={open}
            onOpenChange={onOpenChange}
            title={`Hapus ${number}`}
            description="WO ini belum berjalan (belum ada barang masuk gudang), jadi aman dihapus."
            submitLabel="Hapus WO"
            destructive
            processing={processing}
            onSubmit={() =>
                floorActions.send('delete', route('work-orders.destroy', workOrderId), {}, { onStart: () => setProcessing(true), onFinish: () => setProcessing(false) })
            }
        >
            <p className="text-sm text-muted-foreground">Semua baris artikel di WO ini ikut terhapus.</p>
        </FormSheet>
    );
}
