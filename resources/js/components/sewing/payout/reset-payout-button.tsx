import { FormField } from '@/components/form-field';
import { FormSheet } from '@/components/sewing/master/form-sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatIdr } from '@/lib/format';
import { useForm } from '@inertiajs/react';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

type ResetPayoutButtonProps = { payoutId: number; code: string; paidCount: number; slipCount: number; paidAmount: number };

/** Owner: hapus total pencairan (termasuk slip dibayar) supaya gaji bisa dihitung ulang dari awal. */
export function ResetPayoutButton({ payoutId, code, paidCount, slipCount, paidAmount }: ResetPayoutButtonProps) {
    const [open, setOpen] = useState(false);
    const form = useForm({ confirm_code: '' });

    return (
        <>
            <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
                <RotateCcw />
                Hapus total &amp; ulangi
            </Button>

            <FormSheet
                open={open}
                onOpenChange={(next) => {
                    setOpen(next);
                    if (!next) form.reset();
                }}
                title={`Hapus total ${code}`}
                description="Pencairan dan semua slipnya dihapus, termasuk yang sudah ditandai dibayar."
                submitLabel="Hapus total"
                destructive
                processing={form.processing}
                disabled={form.data.confirm_code.trim() !== code}
                onSubmit={() => form.delete(route('payouts.force-destroy', payoutId), { onSuccess: () => setOpen(false) })}
            >
                <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertDescription>
                        {paidCount} dari {slipCount} slip sudah tercatat dibayar ({formatIdr(paidAmount)}). Kalau uangnya memang sudah diberikan ke penjahit,
                        pastikan dicatat lagi di pencairan baru supaya tidak dibayar dua kali.
                    </AlertDescription>
                </Alert>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Setoran, revisi bahan, dan uang makan di dalamnya kembali berstatus belum dibayar.</li>
                    <li>Buat pencairan baru untuk menghitungnya lagi dari awal.</li>
                    <li>Link slip gaji yang sudah dikirim lewat WA tidak bisa dibuka lagi.</li>
                </ul>
                <FormField label={`Ketik ${code} untuk konfirmasi`} htmlFor="reset-payout-confirm" error={form.errors.confirm_code}>
                    <Input
                        id="reset-payout-confirm"
                        value={form.data.confirm_code}
                        onChange={(event) => form.setData('confirm_code', event.target.value)}
                        autoComplete="off"
                        placeholder={code}
                    />
                </FormField>
            </FormSheet>
        </>
    );
}
