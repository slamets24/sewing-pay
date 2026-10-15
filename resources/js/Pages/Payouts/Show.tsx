import { ConfirmButton } from '@/components/confirm-button';
import { EmptyState } from '@/components/empty-state';
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
import { ArrowLeft, CircleCheck, Clock, ListChecks, Receipt, RefreshCw, Shirt, Trash2, Users, Wallet } from 'lucide-react';
import { useState } from 'react';

type PayoutShowProps = {
    payout: PayoutSummary;
    slips: PayoutSlipRecord[];
};

type DraftAction = 'regenerate' | 'pay-all' | 'destroy';

export default function PayoutShow({ payout, slips }: PayoutShowProps) {
    const set = new PayoutSlipSet(slips);

    return (
        <AppLayout title={`Pencairan ${payout.code}`}>
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
                <div className="col-span-2">
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
                <div className="col-span-2 lg:col-span-1">
                    <StatTile label="Status" value={payout.status_label} hint={set.paidLabel} icon={payout.is_draft ? Clock : CircleCheck} tone={PayoutTone.forStatus(payout.status)} />
                </div>
            </div>

            <div className="flex flex-col gap-5">
                {payout.notes && (
                    <p className="rounded-lg border bg-card px-4 py-3 text-base">
                        <span className="font-semibold">Catatan:</span> {payout.notes}
                    </p>
                )}

                {payout.is_draft ? (
                    <DraftActions payout={payout} set={set} />
                ) : (
                    <Alert className="border-stage-done/40 bg-stage-done/10 text-base">
                        <CircleCheck />
                        <AlertTitle className="line-clamp-none text-base font-bold">Pencairan ini sudah dibayar semua.</AlertTitle>
                        {payout.paid_at && <AlertDescription className="text-base text-foreground">Selesai {formatDateTime(payout.paid_at)}.</AlertDescription>}
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

    const run = (action: DraftAction, method: 'post' | 'delete', url: string) =>
        floorActions.send(method, url, {}, { onStart: () => setBusy(action), onFinish: () => setBusy(null) });

    return (
        <Section title="Tindakan draft" icon={ListChecks}>
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" disabled={busy !== null || hasPaidSlips} onClick={() => run('regenerate', 'post', route('payouts.regenerate', payout.id))}>
                        <RefreshCw className={cn(busy === 'regenerate' && 'animate-spin')} />
                        Hitung ulang
                    </Button>
                    <ConfirmButton
                        variant="default"
                        disabled={busy !== null || set.count === 0 || set.allPaid}
                        confirmLabel={`Ya, bayar ${set.unpaidCount} slip`}
                        onConfirm={() => run('pay-all', 'post', route('payouts.paid', payout.id))}
                    >
                        <CircleCheck />
                        Tandai semua dibayar
                    </ConfirmButton>
                    <ConfirmButton
                        variant="outline"
                        idleClassName="text-destructive"
                        disabled={busy !== null || hasPaidSlips}
                        confirmLabel="Ya, hapus draft"
                        onConfirm={() => run('destroy', 'delete', route('payouts.destroy', payout.id))}
                    >
                        <Trash2 />
                        Hapus draft
                    </ConfirmButton>
                </div>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-base text-muted-foreground">
                    {hasPaidSlips ? (
                        <li>Sudah ada slip yang dibayar, jadi draft ini tidak bisa dihitung ulang atau dihapus lagi.</li>
                    ) : (
                        <li>Ada setoran baru sebelum tanggal batas? Tekan Hitung ulang. Bonus dan potongan yang sudah diisi tetap tersimpan.</li>
                    )}
                    <li>Tombol bayar dan hapus perlu ditekan dua kali supaya tidak salah tekan.</li>
                </ul>
            </div>
        </Section>
    );
}
