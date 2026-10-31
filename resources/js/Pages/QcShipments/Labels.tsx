import { FlashToaster } from '@/components/flash-toaster';
import { LabelPrintStyle } from '@/components/sewing/quality/label-print-style';
import { PieceLabelCard } from '@/components/sewing/quality/piece-label';
import { SegmentedChoice } from '@/components/sewing/quality/segmented-choice';
import { ToneBadge } from '@/components/sewing/tone-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LabelSheet, type LabelSize } from '@/domain/quality/label-sheet';
import { formatDateTime, variantLabel } from '@/lib/format';
import type { DeliveryRecord, QcShipmentRecord } from '@/types/sewing';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';

type QcShipmentLabelsProps = {
    shipment: QcShipmentRecord;
    deliveries: DeliveryRecord[];
};

/** Standalone print page (no sidebar): cover sheet for the hand-over, then one barcode label per piece. */
export default function QcShipmentLabels({ shipment, deliveries }: QcShipmentLabelsProps) {
    const sheet = useMemo(() => LabelSheet.for(shipment, deliveries), [shipment, deliveries]);
    const [size, setSize] = useState<LabelSize>('a4');

    return (
        <div className="min-h-screen bg-background text-base print:min-h-0 print:bg-white">
            <Head title={`Label ${shipment.number}`} />
            <LabelPrintStyle size={size} />

            <header className="sticky top-0 z-30 border-b border-border/60 bg-card/95 shadow-sm backdrop-blur-md print:hidden">
                <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
                    <Button asChild variant="ghost">
                        <Link href={route('qc-shipments.index')}>
                            <ArrowLeft aria-hidden />
                            Kembali
                        </Link>
                    </Button>
                    <h1 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight">Label {shipment.number}</h1>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 print:block print:max-w-none print:p-0">
                <PrintSettings sheet={sheet} size={size} onSizeChange={setSize} />
                <ShipmentSummary sheet={sheet} />

                <section aria-label="Label barcode" className="flex flex-col gap-3 print:block">
                    <h2 className="font-display text-xl font-bold uppercase print:hidden">{sheet.labels.length} label</h2>
                    <div className="qc-sheet">
                        {sheet.labels.map((label) => (
                            <PieceLabelCard key={label.key} label={label} />
                        ))}
                    </div>
                </section>
            </main>

            <FlashToaster />
        </div>
    );
}

function PrintSettings({ sheet, size, onSizeChange }: { sheet: LabelSheet; size: LabelSize; onSizeChange: (size: LabelSize) => void }) {
    const option = LabelSheet.size(size);
    const missing = sheet.withoutBarcode;

    return (
        <section className="flex flex-col gap-4 rounded-lg border border-t-4 border-t-primary bg-card p-4 shadow-xs print:hidden" aria-label="Pengaturan cetak">
            <div className="flex flex-col gap-2">
                <h2 className="font-display text-xl font-bold uppercase">Ukuran label</h2>
                <SegmentedChoice options={LabelSheet.sizes} value={size} onChange={onSizeChange} label="Ukuran label" />
                <p className="text-sm text-muted-foreground">
                    {option.hint} Perkiraan: {sheet.sheetCount(size)} {size === 'a4' ? 'halaman' : 'label'}.
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <Button size="lg" onClick={() => window.print()} className="w-full sm:w-fit">
                    <Printer aria-hidden />
                    Cetak / simpan PDF
                </Button>
            </div>

            {missing.length > 0 && (
                <Alert className="border-stage-revision/40 bg-stage-revision/10">
                    <TriangleAlert aria-hidden className="text-stage-revision" />
                    <AlertTitle className="text-base font-semibold">{sheet.missingBarcodePcs} pcs belum punya barcode</AlertTitle>
                    <AlertDescription className="text-sm text-foreground">
                        <p>
                            Labelnya tetap dicetak dengan kotak kosong. Lengkapi barcode varian di menu Artikel (tarik dari packingv2), lalu buka halaman ini lagi.
                        </p>
                        <ul className="list-disc pl-5">
                            {missing.map((delivery) => (
                                <li key={delivery.id}>
                                    {delivery.article_name}
                                    {variantLabel(delivery.color, delivery.size) && ` · ${variantLabel(delivery.color, delivery.size)}`} ({delivery.qty} pcs)
                                </li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
        </section>
    );
}

/** Cover sheet: on screen above the labels, and the first printed A4 page (signed at hand-over). */
function ShipmentSummary({ sheet }: { sheet: LabelSheet }) {
    const { shipment, deliveries } = sheet;

    return (
        <section className="qc-summary overflow-hidden rounded-lg border bg-card shadow-xs print:overflow-visible print:rounded-none print:border-0 print:shadow-none" aria-label="Ringkasan kiriman">
            <header className="flex flex-wrap items-end justify-between gap-3 border-b bg-muted/60 px-4 py-3 print:bg-transparent print:px-0">
                <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase">Kiriman ke QC</p>
                    <h2 className="font-display text-3xl font-bold">{shipment.number}</h2>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                    <SummaryFact label="Tanggal" value={formatDateTime(shipment.sent_at)} />
                    <SummaryFact label="Setoran" value={String(deliveries.length)} />
                    <SummaryFact label="Total" value={`${sheet.totalPcs} pcs`} />
                    <SummaryFact label="Dibuat oleh" value={shipment.created_by_name ?? '-'} />
                </dl>
            </header>

            {shipment.notes && <p className="border-b px-4 py-2 text-base print:px-0">Catatan: {shipment.notes}</p>}

            <ol className="divide-y">
                {deliveries.map((delivery, index) => {
                    const variant = variantLabel(delivery.color, delivery.size);

                    return (
                        <li key={delivery.id} className="flex items-start gap-3 px-4 py-2.5 break-inside-avoid print:px-0 print:py-1.5">
                            <span className="w-7 shrink-0 text-muted-foreground tabular">{index + 1}.</span>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">
                                    {delivery.article_name}
                                    {variant && <span className="font-normal"> · {variant}</span>}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    WO {delivery.work_order_number} · {LabelSheet.tailorLabel(delivery)}
                                    {delivery.barcode_value && <span className="font-mono"> · {delivery.barcode_value}</span>}
                                </p>
                                {!delivery.barcode_value && (
                                    <ToneBadge tone="revision" className="mt-1">
                                        Belum ada barcode
                                    </ToneBadge>
                                )}
                            </div>
                            <span className="shrink-0 text-lg font-bold tabular">{delivery.qty} pcs</span>
                        </li>
                    );
                })}
            </ol>

            <footer className="flex flex-col gap-4 border-t px-4 py-3 print:px-0">
                <p className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="tabular">{sheet.totalPcs} pcs</span>
                </p>
                <div className="hidden grid-cols-2 gap-8 pt-6 print:grid">
                    <Signature label="Diserahkan (gudang)" />
                    <Signature label="Diterima (QC)" />
                </div>
            </footer>
        </section>
    );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-semibold">{value}</dd>
        </div>
    );
}

function Signature({ label }: { label: string }) {
    return (
        <div className="flex flex-col gap-12">
            <span className="text-sm">{label}</span>
            <span className="border-t border-foreground pt-1 text-sm">Nama &amp; tanda tangan</span>
        </div>
    );
}
