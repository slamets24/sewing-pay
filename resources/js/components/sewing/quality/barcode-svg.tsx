import { QrCode } from '@/domain/quality/qr-code';
import { useMemo } from 'react';

/** QR Code for one label with barcode text underneath; dashed box when barcode is missing or invalid. */
export function BarcodeSvg({ value }: { value: string | null }) {
    const svgHtml = useMemo(() => {
        if (!value) return null;
        return QrCode.generateSvg(value, 0);
    }, [value]);

    const missing = !value || !svgHtml;

    return (
        <div className="qc-label__code">
            {!missing ? (
                <div
                    className="qc-label__qr"
                    role="img"
                    aria-label={`QR Code ${value}`}
                    dangerouslySetInnerHTML={{ __html: svgHtml }}
                />
            ) : (
                <div className="qc-label__missing">
                    {value ? 'BARCODE TIDAK VALID' : 'BARCODE BELUM ADA'}
                </div>
            )}
            <div className="qc-label__barcode-text">{value || '-'}</div>
        </div>
    );
}
