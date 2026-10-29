import type { PieceLabel } from '@/domain/quality/label-sheet';
import { BarcodeSvg } from './barcode-svg';

/**
 * Sticker label matching the requested template:
 * - Left: QR Code + Barcode text underneath
 * - Right: Brand Name (e.g. AZZAHRA), Article Name, Variant (Color | Size), and Tailor Code
 */
export function PieceLabelCard({ label }: { label: PieceLabel }) {
    const tailorDisplay = label.tailorCode || label.tailorName;

    return (
        <article className="qc-label" aria-label={`Label ${label.articleName} ${label.piece} dari ${label.of}`}>
            <div className="qc-label__left">
                <BarcodeSvg value={label.barcode} />
            </div>

            <div className="qc-label__right">
                <p className="qc-label__brand">{label.brandName || 'AZZAHRA'}</p>
                <p className="qc-label__article">{label.articleName}</p>
                {label.variant && <p className="qc-label__variant">{label.variant}</p>}
                {tailorDisplay && <p className="qc-label__tailor">{tailorDisplay}</p>}
            </div>
        </article>
    );
}
