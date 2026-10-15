import { AppLogo } from '@/components/app-logo';
import { FlashToaster } from '@/components/flash-toaster';
import { DeliveryList, HoldingList, PortalSlipList, RevisionList, type PortalSlip } from '@/components/sewing/payout/portal-lists';
import { DisplaySettings } from '@/components/sewing/display-settings';
import { Section } from '@/components/sewing/section';
import { StatTile } from '@/components/sewing/stat-tile';
import { Button } from '@/components/ui/button';
import { TailorPortal } from '@/domain/payout/tailor-portal';
import { formatIdr, joinMeta } from '@/lib/format';
import type { DeliveryRecord, PickupItemRecord, RevisionRecord, TailorRecord } from '@/types/sewing';
import { Head, router } from '@inertiajs/react';
import { Lock, PackageCheck, Receipt, Scissors, Shirt, Wallet, Wrench } from 'lucide-react';

type PortalProps = {
    tailor: TailorRecord;
    lock_url: string;
    holding: PickupItemRecord[];
    unpaid: { qty: number; amount: number };
    recentDeliveries: DeliveryRecord[];
    openRevisions: RevisionRecord[];
    slips: PortalSlip[];
};

export default function PortalIndex(props: PortalProps) {
    return (
        <div className="min-h-screen bg-background">
            <Head title="Pekerjaan saya" />
            <header className="sticky top-0 z-30 border-b border-border/60 bg-card/95 backdrop-blur-md">
                <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
                    <AppLogo subtitle="Portal penjahit" />
                    <div className="ml-auto flex items-center gap-2">
                        <DisplaySettings />
                        <Button type="button" variant="outline" onClick={() => router.post(props.lock_url)}>
                            <Lock />
                            Kunci
                        </Button>
                    </div>
                </div>
            </header>
            <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
                <PortalContent {...props} />
            </main>
            <FlashToaster />
        </div>
    );
}

function PortalContent({ tailor, holding, unpaid, recentDeliveries, openRevisions, slips }: Omit<PortalProps, 'lock_url'>) {
    const portal = new TailorPortal(tailor, holding, recentDeliveries, openRevisions);

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
                <p className="font-display text-3xl leading-tight font-bold break-words">
                    {TailorPortal.greeting()}, {tailor.name}
                </p>
                <p className="text-base text-muted-foreground">
                    {joinMeta(tailor.code, tailor.type_label)}. Halaman ini hanya untuk melihat; semua catatan diisi oleh admin.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatTile label="Sedang saya jahit" value={portal.holdingQty} hint={`pcs, dari ${holding.length} barang`} icon={Scissors} tone="sewing" />
                <StatTile label="Revisi terbuka" value={openRevisions.length} hint={`${portal.openRevisionQty} pcs`} icon={Wrench} tone="revision" />
                <div className="col-span-2 lg:col-span-1">
                    {portal.showsMoney ? (
                        <StatTile label="Belum dibayar" value={formatIdr(unpaid.amount)} hint={`${unpaid.qty} pcs, masuk pencairan berikutnya`} icon={Wallet} tone="primary" />
                    ) : (
                        <StatTile label="Sudah disetor" value={portal.recentDeliveredQty} hint="pcs, dari setoran terakhir" icon={PackageCheck} tone="done" />
                    )}
                </div>
            </div>

            <Section title="Barang yang saya pegang" icon={Shirt} description="Sisa yang belum disetor ke gudang.">
                <HoldingList items={holding} />
            </Section>

            <Section title="Revisi saya" icon={Wrench} description="Revisi yang belum selesai.">
                <RevisionList revisions={openRevisions} />
            </Section>

            <Section title="Setoran terakhir" icon={PackageCheck}>
                <DeliveryList deliveries={recentDeliveries} showMoney={portal.showsMoney} />
            </Section>

            {(portal.showsMoney || slips.length > 0) && (
                <Section title="Slip gaji saya" icon={Receipt} description="Tekan Buka slip untuk melihat rincian dan mencetak.">
                    <PortalSlipList slips={slips} />
                </Section>
            )}
        </div>
    );
}
