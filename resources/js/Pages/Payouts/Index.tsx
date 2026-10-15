import { EmptyState } from '@/components/empty-state';
import { CreatePayoutForm } from '@/components/sewing/payout/create-payout-form';
import { PayoutCard } from '@/components/sewing/payout/payout-card';
import { PageIntro, Section } from '@/components/sewing/section';
import { StatTile } from '@/components/sewing/stat-tile';
import { PayoutRecord } from '@/domain/payout/payout-record';
import { UnpaidWork, type UnpaidWorkProps } from '@/domain/payout/unpaid-work';
import AppLayout from '@/layouts/app-layout';
import { formatIdr } from '@/lib/format';
import type { PayoutSummary } from '@/types/sewing';
import { CalendarPlus, History, Shirt, Wallet, Wrench } from 'lucide-react';

type PayoutIndexProps = {
    payouts: PayoutSummary[];
    hasDraft: boolean;
    unpaid: UnpaidWorkProps;
};

export default function PayoutIndex({ payouts, hasDraft, unpaid }: PayoutIndexProps) {
    const work = new UnpaidWork(unpaid);
    const draft = hasDraft ? PayoutRecord.draftOf(payouts) : null;

    return (
        <AppLayout title="Gaji penjahit">
            <PageIntro>Pilih tanggal batas, lalu semua setoran jahit dan revisi bahan yang belum dibayar sampai tanggal itu masuk ke slip tiap penjahit.</PageIntro>

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <StatTile label="Belum dibayar (jahit)" value={formatIdr(work.deliveryAmount)} hint={`${work.deliveryQty} pcs sudah disetor`} icon={Shirt} tone="sewing" />
                <StatTile label="Revisi bahan belum dibayar" value={formatIdr(work.revisionAmount)} hint="Revisi bahan yang sudah selesai" icon={Wrench} tone="revision" />
                <div className="sm:col-span-2 xl:col-span-1">
                    <StatTile label="Total belum dibayar" value={formatIdr(work.total)} hint="Dihitung sampai hari ini" icon={Wallet} tone="primary" />
                </div>
            </div>

            <div className="flex flex-col gap-5">
                <Section title="Buat pencairan" icon={CalendarPlus} description="Hanya boleh ada satu draft pencairan dalam satu waktu.">
                    <CreatePayoutForm hasDraft={hasDraft} draft={draft} />
                </Section>

                <Section title="Riwayat pencairan" icon={History} description={payouts.length > 0 ? `${payouts.length} pencairan terakhir` : undefined}>
                    {payouts.length === 0 ? (
                        <EmptyState>
                            <Wallet className="size-8" aria-hidden />
                            <p className="text-base">Belum ada pencairan. Buat yang pertama di atas.</p>
                        </EmptyState>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {payouts.map((payout) => (
                                <PayoutCard key={payout.id} payout={payout} />
                            ))}
                        </div>
                    )}
                </Section>
            </div>
        </AppLayout>
    );
}
