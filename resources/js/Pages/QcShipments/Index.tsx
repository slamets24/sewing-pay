import { EmptyState } from '@/components/empty-state';
import { DeliveryPickList, SelectAllButton } from '@/components/sewing/quality/delivery-pick-list';
import { SegmentedChoice } from '@/components/sewing/quality/segmented-choice';
import { ShipmentHistory } from '@/components/sewing/quality/shipment-history';
import { ShipmentSubmitBar } from '@/components/sewing/quality/shipment-submit-bar';
import { useDraftPost } from '@/components/sewing/quality/use-draft-post';
import { PageIntro, Section } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { DeliveryGroups, type DeliveryGrouping } from '@/domain/quality/delivery-groups';
import { DeliverySelection } from '@/domain/quality/delivery-selection';
import AppLayout from '@/layouts/app-layout';
import type { DeliveryRecord, QcShipmentRecord } from '@/types/sewing';
import { History, PackageCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

type QcShipmentsIndexProps = {
    unshippedDeliveries: DeliveryRecord[];
    shipments: QcShipmentRecord[];
};

type PickGrouping = Exclude<DeliveryGrouping, 'shipment'>;

export default function QcShipmentsIndex({ unshippedDeliveries, shipments }: QcShipmentsIndexProps) {
    const [grouping, setGrouping] = useState<PickGrouping>('tailor');
    const [picked, setPicked] = useState(DeliverySelection.none);
    const [notes, setNotes] = useState('');
    const { post, errors, processing } = useDraftPost();

    // Drop ticks for deliveries that disappeared after a reload (e.g. shipped from another phone).
    const selection = useMemo(() => picked.keepOnly(unshippedDeliveries), [picked, unshippedDeliveries]);
    const groups = useMemo(() => DeliveryGroups.by(unshippedDeliveries, grouping), [unshippedDeliveries, grouping]);
    const allIds = useMemo(() => unshippedDeliveries.map((delivery) => delivery.id), [unshippedDeliveries]);
    const totalQty = unshippedDeliveries.reduce((total, delivery) => total + delivery.qty, 0);
    const missingBarcode = unshippedDeliveries.filter((delivery) => !delivery.barcode_value).length;
    const allPicked = selection.covers(allIds);

    // The server answers with the label page of the new shipment.
    const send = () => post(route('qc-shipments.store'), selection.toPayload(notes));

    return (
        <AppLayout title="Kirim ke QC">
            <PageIntro>Admin memilih setoran jahit yang siap dikirimkan ke divisi QC. Label barcode (1 label / pcs) langsung dicetak oleh admin untuk ditempel pada bundle pengiriman.</PageIntro>

            <div className="flex flex-col gap-5">
                <Section
                    title="Belum dikirim ke QC"
                    description={`${unshippedDeliveries.length} setoran · ${totalQty} pcs`}
                    icon={PackageCheck}
                >
                    {unshippedDeliveries.length === 0 ? (
                        <EmptyState>
                            <PackageCheck className="size-8" aria-hidden />
                            <span className="text-base">Semua setoran sudah dikirim ke QC.</span>
                        </EmptyState>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <SegmentedChoice options={DeliveryGroups.pickOptions} value={grouping} onChange={setGrouping} label="Kelompokkan setoran" />
                                <SelectAllButton
                                    picked={allPicked}
                                    onClick={() => setPicked(selection.withMany(allIds, !allPicked))}
                                    pickLabel="Pilih semua setoran"
                                    unpickLabel="Kosongkan pilihan"
                                />
                            </div>
                            {missingBarcode > 0 && (
                                <ToneBadge tone="revision" className="whitespace-normal">
                                    {missingBarcode} setoran belum ada barcode
                                </ToneBadge>
                            )}
                            <DeliveryPickList groups={groups} grouping={grouping} selection={selection} onChange={setPicked} />
                        </div>
                    )}
                </Section>

                {unshippedDeliveries.length > 0 && (
                    <ShipmentSubmitBar
                        count={selection.count}
                        qty={selection.qtyIn(unshippedDeliveries)}
                        notes={notes}
                        onNotesChange={setNotes}
                        onSubmit={send}
                        processing={processing}
                        error={errors.delivery_ids ?? errors.notes ?? errors['delivery_ids.0']}
                    />
                )}

                <Section title="Riwayat kiriman" description="40 kiriman terakhir" icon={History}>
                    <ShipmentHistory shipments={shipments} />
                </Section>
            </div>
        </AppLayout>
    );
}
