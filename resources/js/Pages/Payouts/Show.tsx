import { ConfirmButton } from '@/components/confirm-button';
import { EmptyState } from '@/components/empty-state';
import { ResetPayoutButton } from '@/components/sewing/payout/reset-payout-button';
import { SlipCard } from '@/components/sewing/payout/slip-card';
import { PageIntro, Section } from '@/components/sewing/section';
import { StatTile } from '@/components/sewing/stat-tile';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PayoutSlipSet } from '@/domain/payout/payout-slip-set';
import { PayoutTone } from '@/domain/payout/payout-tone';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatDateTime, formatIdr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { floorActions } from '@/services/floor-actions';
import type { PayoutSlipRecord, PayoutSummary } from '@/types/sewing';
import { Link } from '@inertiajs/react';
import { ArrowLeft, CircleCheck, Clock, ListChecks, Receipt, RefreshCw, Send, ShieldCheck, Shirt, Trash2, Undo2, Users, Wallet } from 'lucide-react';
import { useState } from 'react';

type PayoutShowProps = {
    payout: PayoutSummary;
    slips: PayoutSlipRecord[];
};

type DraftAction = 'regenerate' | 'pay-all' | 'destroy' | 'submit-hr';

export default function PayoutShow({ payout, slips }: PayoutShowProps) {
    const set = new PayoutSlipSet(slips);

    return (
        <AppLayout title={`Pencairan ${payout.code}`} shortTitle={`Gaji ${payout.code}`}>
            <PageIntro
                actions={
                    <Button asChild variant="outline">
                        <Link href={route('payouts.index')}>
                            <ArrowLeft />
                            Semua pencairan
                        </Link>
                    </Button>
                }
            >
                Tanggal batas <span className="font-semibold text-foreground">{formatDate(payout.cutoff_date)}</span>
                {payout.generated_at && <> · dihitung {formatDateTime(payout.generated_at)}</>}
            </PageIntro>

            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <div className="lg:col-span-2">
                    <StatTile
                        label="Total diterima"
                        value={formatIdr(payout.total_amount)}
                        hint={set.unpaidCount > 0 ? `Belum dibayar ${formatIdr(set.unpaidNet)}` : undefined}
                        icon={Wallet}
                        tone="primary"
                    />
                </div>
                <StatTile label="Penjahit" value={payout.total_tailors} icon={Users} tone="ready" />
                <StatTile label="Pcs" value={payout.total_qty} icon={Shirt} tone="sewing" />
                <div>
                    <StatTile label="Status" value={payout.status_label} hint={set.paidLabel} icon={payout.is_draft ? Clock : CircleCheck} tone={PayoutTone.forStatus(payout.status)} />
                </div>
            </div>

            <div className="flex flex-col gap-5">
                {payout.notes && (
                    <p className="rounded-lg border bg-card px-4 py-3 text-base">
                        <span className="font-semibold">Catatan:</span> {payout.notes}
                    </p>
                )}

                {payout.is_draft && payout.needs_hr_approval && <HrApprovalNotice payout={payout} />}

                {payout.is_draft ? (
                    <DraftActions payout={payout} set={set} />
                ) : (
                    <Alert className="border-stage-done/40 bg-stage-done/10 text-base">
                        <CircleCheck />
                        <AlertTitle className="line-clamp-none text-base font-bold">Pencairan ini sudah dibayar semua.</AlertTitle>
                        {payout.paid_at && <AlertDescription className="text-base text-foreground">Selesai {formatDateTime(payout.paid_at)}.</AlertDescription>}
                        <div className="col-start-2 mt-3">
                            <ResetPayoutButton payoutId={payout.id} code={payout.code} paidCount={set.paidCount} slipCount={set.count} paidAmount={payout.total_amount - set.unpaidNet} />
                        </div>
                    </Alert>
                )}

                <Section
                    title="Slip per penjahit"
                    icon={Receipt}
                    description={set.withoutWhatsappCount > 0 ? `${set.paidLabel} · ${set.withoutWhatsappCount} penjahit belum ada No. WA` : set.paidLabel}
                >
                    {slips.length === 0 ? (
                        <EmptyState>
                            <Receipt className="size-8" aria-hidden />
                            <p className="text-base">Tidak ada setoran atau revisi bahan yang belum dibayar sampai tanggal batas ini.</p>
                        </EmptyState>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {slips.map((slip) => (
                                <SlipCard key={slip.id} slip={slip} />
                            ))}
                        </div>
                    )}
                </Section>
            </div>
        </AppLayout>
    );
}

/** Recalculate, pay everything, or throw the draft away. */
function DraftActions({ payout, set }: { payout: PayoutSummary; set: PayoutSlipSet }) {
    const [busy, setBusy] = useState<DraftAction | null>(null);
    const hasPaidSlips = set.paidCount > 0;
    const lockedByHr = payout.is_locked_by_hr ?? false;
    const canBePaid = payout.can_be_paid ?? true;
    const canSubmitToHr = (payout.needs_hr_approval ?? false) && !lockedByHr && set.count > 0;

    const run = (action: DraftAction, method: 'post' | 'delete', url: string) =>
        floorActions.send(method, url, {}, { onStart: () => setBusy(action), onFinish: () => setBusy(null) });

    return (
        <Section title="Tindakan draft" icon={ListChecks}>
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                    {canSubmitToHr && (
                        <ConfirmButton
                            variant="default"
                            disabled={busy !== null}
                            confirmLabel="Ya, kirim ke HR"
                            onConfirm={() => run('submit-hr', 'post', route('payouts.submit-hr', payout.id))}
                        >
                            <Send />
                            {payout.hr_status === 'returned' ? 'Kirim ulang ke HR' : 'Kirim ke HR untuk acc'}
                        </ConfirmButton>
                    )}
                    <Button type="button" variant="outline" disabled={busy !== null || hasPaidSlips || lockedByHr} onClick={() => run('regenerate', 'post', route('payouts.regenerate', payout.id))}>
                        <RefreshCw className={cn(busy === 'regenerate' && 'animate-spin')} />
                        Hitung ulang
                    </Button>
                    <ConfirmButton
                        variant="default"
                        disabled={busy !== null || set.count === 0 || set.allPaid || !canBePaid}
                        confirmLabel={`Ya, bayar ${set.unpaidCount} slip`}
                        onConfirm={() => run('pay-all', 'post', route('payouts.paid', payout.id))}
                    >
                        <CircleCheck />
                        Tandai semua dibayar
                    </ConfirmButton>
                    <ConfirmButton
                        variant="outline"
                        idleClassName="text-destructive"
                        disabled={busy !== null || hasPaidSlips || lockedByHr}
                        confirmLabel="Ya, hapus draft"
                        onConfirm={() => run('destroy', 'delete', route('payouts.destroy', payout.id))}
                    >
                        <Trash2 />
                        Hapus draft
                    </ConfirmButton>
                </div>
                {hasPaidSlips && (
                    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Sebagian slip sudah dibayar, jadi draft tidak bisa dihitung ulang atau dihapus biasa. Owner bisa menghapus total lalu mengulang dari awal.
                        </p>
                        <ResetPayoutButton payoutId={payout.id} code={payout.code} paidCount={set.paidCount} slipCount={set.count} paidAmount={payout.total_amount - set.unpaidNet} />
                    </div>
                )}
            </div>
        </Section>
    );
}

/** Status acc HR untuk pencairan ini: belum dikirim, menunggu, disetujui (boleh dibayar), atau dikembalikan dengan catatan. */
function HrApprovalNotice({ payout }: { payout: PayoutSummary }) {
    const status = payout.hr_status ?? null;
    const decidedBy = [payout.hr_decided_by, payout.hr_decided_at ? formatDateTime(payout.hr_decided_at) : null].filter(Boolean).join(' · ');

    if (status === 'approved') {
        return (
            <Alert className="border-stage-done/40 bg-stage-done/10 text-base">
                <ShieldCheck />
                <AlertTitle className="line-clamp-none text-base font-bold">Disetujui HR, slip sudah boleh dibayar.</AlertTitle>
                <AlertDescription className="text-base text-foreground">
                    {decidedBy && <>Di-acc {decidedBy}. </>}
                    {payout.hr_note}
                </AlertDescription>
            </Alert>
        );
    }

    if (status === 'submitted') {
        return (
            <Alert className="text-base">
                <Clock />
                <AlertTitle className="line-clamp-none text-base font-bold">Menunggu acc HR.</AlertTitle>
                <AlertDescription className="text-base text-foreground">
                    Dikirim {payout.hr_submitted_at ? formatDateTime(payout.hr_submitted_at) : ''}. Bonus, kasbon dan potongan dikunci di OPSEW; HR bisa mengubahnya saat acc.
                </AlertDescription>
            </Alert>
        );
    }

    if (status === 'returned') {
        return (
            <Alert variant="destructive" className="text-base">
                <Undo2 />
                <AlertTitle className="line-clamp-none text-base font-bold">Dikembalikan HR.</AlertTitle>
                <AlertDescription className="text-base">
                    {decidedBy && <>Oleh {decidedBy}. </>}
                    {payout.hr_note ?? 'Perbaiki lalu kirim ulang ke HR.'}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Alert className="text-base">
            <Send />
            <AlertTitle className="line-clamp-none text-base font-bold">Belum dikirim ke HR.</AlertTitle>
            <AlertDescription className="text-base text-foreground">Periksa slip, lalu tekan "Kirim ke HR untuk acc". Slip baru bisa dibayar setelah HR acc.</AlertDescription>
        </Alert>
    );
}
