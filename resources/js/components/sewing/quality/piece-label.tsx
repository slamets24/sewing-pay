import type { PieceLabel } from '@/domain/quality/label-sheet';
import { BarcodeSvg } from './barcode-svg';

/** One sticker: barcode first (for the packing scanner), then what a person needs to read at a glance. */
export function PieceLabelCard({ label }: { label: PieceLabel }) {
    return (
        <article className="qc-label" aria-label={`Label ${label.articleName} ${label.piece} dari ${label.of}`}>
            <BarcodeSvg value={label.barcode} />
            <p className="qc-label__article">{label.articleName}</p>
            {label.variant && <p className="qc-label__variant">{label.variant}</p>}
            <p className="qc-label__meta">
                WO {label.workOrderNumber} · {label.tailor}
            </p>
            <p className="qc-label__foot">
                <span>{label.shipmentNumber}</span>
                <span>
                    {label.piece}/{label.of}
                </span>
            </p>
        </article>
    );
}
