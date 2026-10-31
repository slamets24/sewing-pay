import { EmptyState } from '@/components/empty-state';
import { RevisionCard } from '@/components/sewing/quality/revision-card';
import { RevisionReportSheet } from '@/components/sewing/quality/revision-report-sheet';
import { SegmentedChoice } from '@/components/sewing/quality/segmented-choice';
import { Section } from '@/components/sewing/section';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { RevisionFilter, RevisionView, type RevisionStatusFilter } from '@/domain/quality/revision-view';
import AppLayout from '@/layouts/app-layout';
import { ToneStyle } from '@/lib/tone';
import type { DeliveryRecord, PickupItemRecord, RevisionPartRecord, RevisionRecord, RevisionType, TailorRecord } from '@/types/sewing';
import { router } from '@inertiajs/react';
import { Wrench } from 'lucide-react';
import { useState } from 'react';

type RevisionsIndexProps = {
    filters: { status: RevisionStatusFilter; type: RevisionType | null };
    revisions: RevisionRecord[];
    sewingItems: PickupItemRecord[];
    shippedDeliveries: DeliveryRecord[];
    revisionParts: RevisionPartRecord[];
    tailors: TailorRecord[];
};

const LIST_LIMIT = 200;

export default function RevisionsIndex({ filters, revisions, sewingItems, shippedDeliveries, revisionParts, tailors }: RevisionsIndexProps) {
    const [preset] = useState(() => presetItem(sewingItems));
    const filter = RevisionFilter.from(filters);
    const counts = RevisionView.statusCounts(revisions);

    const applyFilter = (next: RevisionFilter) => router.get(route('revisions.index'), next.toQuery(), { preserveState: true, preserveScroll: true });

    return (
        <AppLayout title="Catat Revisi">


            <div className="mb-5 flex flex-col gap-3 lg:flex-row-reverse lg:items-start">
                <RevisionReportSheet shippedDeliveries={shippedDeliveries} sewingItems={sewingItems} revisionParts={revisionParts} tailors={tailors} preset={preset} />
                <FilterPanel filter={filter} onChange={applyFilter} />
            </div>

            <Section
                title="Daftar revisi"
                description={revisions.length >= LIST_LIMIT ? `Menampilkan ${LIST_LIMIT} catatan terbaru` : `${revisions.length} catatan`}
                icon={Wrench}
            >
                {revisions.length === 0 ? (
                    <EmptyState>
                        <Wrench className="size-8" aria-hidden />
                        <span className="text-base">{filter.emptyMessage}</span>
                    </EmptyState>
                ) : (
                    <div className="flex flex-col gap-4">
                        {counts.length > 1 && (
                            <div className="flex flex-wrap gap-2" aria-label="Jumlah per status">
                                {counts.map((row) => (
                                    <ToneBadge key={row.status} tone={ToneStyle.forRevisionStatus(row.status)}>
                                        {row.label}: {row.count}
                                    </ToneBadge>
                                ))}
                            </div>
                        )}
                        <div className="grid gap-3 lg:grid-cols-2">
                            {revisions.map((revision) => (
                                <RevisionCard key={`${revision.id}-${revision.status}-${revision.tailor_id}`} revision={revision} tailors={tailors} />
                            ))}
                        </div>
                    </div>
                )}
            </Section>
        </AppLayout>
    );
}

function FilterPanel({ filter, onChange }: { filter: RevisionFilter; onChange: (filter: RevisionFilter) => void }) {
    return (
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-xs lg:flex-1 lg:flex-row lg:flex-wrap lg:gap-x-8">
            <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-muted-foreground uppercase">Status</span>
                <SegmentedChoice options={RevisionFilter.statusOptions} value={filter.status} onChange={(status) => onChange(filter.withStatus(status))} label="Saring menurut status" />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-muted-foreground uppercase">Jenis</span>
                <SegmentedChoice options={RevisionFilter.typeOptions} value={filter.typeChoice} onChange={(choice) => onChange(filter.withTypeChoice(choice))} label="Saring menurut jenis" />
            </div>
        </div>
    );
}

/** "?lapor=<pickup item id>" (from the Setor page) opens the form for that item right away. */
function presetItem(items: PickupItemRecord[]): PickupItemRecord | null {
    const id = Number(new URLSearchParams(window.location.search).get('lapor'));

    return items.find((item) => item.id === id) ?? null;
}
