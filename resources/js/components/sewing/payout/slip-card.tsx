import { Card } from '@/components/ui/card';
import { ConfirmButton } from '@/components/confirm-button';
import { FormField, InputError } from '@/components/form-field';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PayoutTone } from '@/domain/payout/payout-tone';
import { formatDateTime, formatIdr, joinMeta } from '@/lib/format';
import { ToneStyle } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { floorActions } from '@/services/floor-actions';
import type { PayoutSlipRecord } from '@/types/sewing';
import { ChevronDown, CircleCheck, FileText, MessageCircle, Save, Undo2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AmountInput } from './amount-input';
import { PayoutStatusBadge } from './payout-status-badge';
import { SlipLineList } from './slip-line-list';
import { useSlipAdjustment } from './use-slip-adjustment';

/** One tailor's slip inside a pay run: the money, bonus/kasbon/potongan edit, pay / WhatsApp buttons and the work lines. */
export function SlipCard({ slip }: { slip: PayoutSlipRecord }) {
    const [showLines, setShowLines] = useState(false);
    const [paying, setPaying] = useState(false);
    const { form, adjustment, dirty, errors, save, reset } = useSlipAdjustment(slip);

    const editable = !slip.is_paid && !slip.is_locked;
    const canPay = slip.can_pay ?? !slip.is_paid;
    const bonus = editable ? adjustment.bonus : slip.bonus_amount;
    const deduction = editable ? adjustment.deduction : slip.deduction_amount;
    const kasbonWarung = editable ? adjustment.kasbonWarung : (slip.kasbon_warung_amount ?? 0);
    const kasbonMingguan = editable ? adjustment.kasbonMingguan : (slip.kasbon_mingguan_amount ?? 0);
    const net = editable ? adjustment.net : slip.net_amount;
    const linesId = `slip-${slip.id}-lines`;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        save();
    };

    const markPaid = () =>
        floorActions.send('post', route('payout-slips.paid', slip.id), {}, { onStart: () => setPaying(true), onFinish: () => setPaying(false) });

    return (
        <Card asChild>
        <article className={cn('overflow-hidden border border-t-4 bg-card ', ToneStyle.topBorder(PayoutTone.forStatus(slip.status)))}>
            <header className="flex flex-wrap items-start gap-3 px-4 pt-4">
                <div className="min-w-0 flex-1">
                    <h3 className="text-2xl font-bold break-words">{slip.tailor_name}</h3>
                    <p className="text-sm text-muted-foreground">{joinMeta(slip.tailor_code, slip.invoice_number)}</p>
                </div>
                <PayoutStatusBadge status={slip.status} label={slip.status_label} />
            </header>

            <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_15rem]">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2 xl:grid-cols-3">
                    <Figure label="Jumlah" value={`${slip.qty} pcs`} />
                    <Figure label="Kotor" value={formatIdr(slip.gross_amount)} />
                    <Figure label="Bonus" value={`+ ${formatIdr(bonus)}`} />
                    <Figure label="Kasbon warung" value={`− ${formatIdr(kasbonWarung)}`} />
                    <Figure label="Kasbon mingguan" value={`− ${formatIdr(kasbonMingguan)}`} />
                    <Figure label="Potongan lain" value={`− ${formatIdr(deduction)}`} />
                </dl>

                <div className={cn('flex flex-col justify-center gap-1 rounded-lg border-2 px-4 py-3', adjustment.isValid || !editable ? 'border-foreground/15 bg-muted/60' : 'border-destructive bg-destructive/5')}>
                    <span className="text-sm font-bold text-muted-foreground uppercase">Diterima</span>
                    <span className={cn('font-display text-4xl leading-none font-bold tabular', net < 0 && 'text-destructive')}>{formatIdr(net)}</span>
                    {dirty && (
                        <ToneBadge tone="primary" className="mt-1">
                            Belum disimpan
                        </ToneBadge>
                    )}
                    {slip.is_paid && slip.paid_at && <span className="text-sm text-muted-foreground">Dibayar {formatDateTime(slip.paid_at)}</span>}
                </div>
            </div>

            {editable ? (
                <form onSubmit={submit} className="grid gap-3 border-t bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField label="Bonus" htmlFor={`slip-${slip.id}-bonus`} error={adjustment.bonusError ?? errors.bonus_amount}>
                        <AmountInput
                            id={`slip-${slip.id}-bonus`}
                            value={form.data.bonus_amount}
                            onValueChange={(value) => form.setData('bonus_amount', value)}
                            aria-invalid={Boolean(adjustment.bonusError ?? errors.bonus_amount)}
                        />
                    </FormField>
                    <FormField label="Kasbon warung" htmlFor={`slip-${slip.id}-kasbon-warung`} error={errors.kasbon_warung_amount}>
                        <AmountInput
                            id={`slip-${slip.id}-kasbon-warung`}
                            value={form.data.kasbon_warung_amount}
                            onValueChange={(value) => form.setData('kasbon_warung_amount', value)}
                            aria-invalid={Boolean(errors.kasbon_warung_amount)}
                        />
                    </FormField>
                    <FormField label="Kasbon mingguan" htmlFor={`slip-${slip.id}-kasbon-mingguan`} error={errors.kasbon_mingguan_amount}>
                        <AmountInput
                            id={`slip-${slip.id}-kasbon-mingguan`}
                            value={form.data.kasbon_mingguan_amount}
                            onValueChange={(value) => form.setData('kasbon_mingguan_amount', value)}
                            aria-invalid={Boolean(errors.kasbon_mingguan_amount)}
                        />
                    </FormField>
                    <FormField label="Potongan lain" htmlFor={`slip-${slip.id}-deduction`} error={adjustment.deductionError ?? errors.deduction_amount}>
                        <AmountInput
                            id={`slip-${slip.id}-deduction`}
                            value={form.data.deduction_amount}
                            onValueChange={(value) => form.setData('deduction_amount', value)}
                            aria-invalid={Boolean(adjustment.deductionError ?? errors.deduction_amount)}
                        />
                    </FormField>
                    <FormField label="Catatan" htmlFor={`slip-${slip.id}-notes`} error={errors.notes} className="sm:col-span-2 lg:col-span-4">
                        <Input
                            id={`slip-${slip.id}-notes`}
                            value={form.data.notes}
                            maxLength={500}
                            placeholder="Misal: bonus lembur, potongan alat"
                            onChange={(event) => form.setData('notes', event.target.value)}
                        />
                    </FormField>
                    <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
                        <Button type="submit" disabled={!dirty || !adjustment.isValid || form.processing}>
                            <Save />
                            {form.processing ? 'Menyimpan…' : 'Simpan bonus/kasbon/potongan'}
                        </Button>
                        {dirty && (
                            <Button type="button" variant="ghost" onClick={reset} disabled={form.processing}>
                                <Undo2 />
                                Batal ubah
                            </Button>
                        )}
                        <InputError message={errors.payout_slip} />
                    </div>
                </form>
            ) : (
                slip.notes && (
                    <p className="border-t bg-muted/30 px-4 py-3 text-base">
                        <span className="font-semibold">Catatan:</span> {slip.notes}
                    </p>
                )
            )}

            <footer className="flex flex-col gap-2 border-t p-4">
                <div className="flex flex-wrap items-center gap-2">
                    {canPay && (
                        <ConfirmButton variant="default" confirmLabel="Ya, sudah dibayar" onConfirm={markPaid} disabled={paying || dirty}>
                            <CircleCheck />
                            Tandai dibayar
                        </ConfirmButton>
                    )}
                    <WhatsappButton url={slip.whatsapp_url} hintId={`slip-${slip.id}-wa-hint`} />
                    <Button asChild variant="outline">
                        <a href={slip.public_url} target="_blank" rel="noreferrer">
                            <FileText />
                            Lihat slip
                        </a>
                    </Button>
                    <Button type="button" variant="ghost" className="sm:ml-auto" aria-expanded={showLines} aria-controls={linesId} onClick={() => setShowLines(!showLines)}>
                        <ChevronDown className={cn('transition-transform', showLines && 'rotate-180')} />
                        {showLines ? 'Tutup rincian' : `Rincian (${slip.lines.length})`}
                    </Button>
                </div>
                {editable && dirty && <p className="text-sm text-muted-foreground">Simpan bonus/potongan dulu sebelum menandai dibayar.</p>}
                {!slip.whatsapp_url && (
                    <p id={`slip-${slip.id}-wa-hint`} className="text-sm text-muted-foreground">
                        No. WA belum diisi. Isi di menu Penjahit supaya slip bisa dikirim.
                    </p>
                )}
            </footer>

            {showLines && (
                <div id={linesId} className="border-t p-4">
                    <SlipLineList lines={slip.lines} />
                </div>
            )}
        </article>
        </Card>
    );
}

function Figure({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-sm font-semibold text-muted-foreground uppercase">{label}</dt>
            <dd className="text-lg font-bold break-words tabular">{value}</dd>
        </div>
    );
}

function WhatsappButton({ url, hintId }: { url: string | null; hintId: string }) {
    if (!url) {
        return (
            <Button type="button" variant="outline" disabled aria-describedby={hintId}>
                <MessageCircle />
                Kirim WA
            </Button>
        );
    }

    return (
        <Button asChild variant="outline">
            <a href={url} target="_blank" rel="noreferrer">
                <MessageCircle className="text-stage-done" />
                Kirim WA
            </a>
        </Button>
    );
}
