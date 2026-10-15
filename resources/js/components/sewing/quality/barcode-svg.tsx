import { Code128 } from '@/domain/quality/code128';
import { useEffect, useRef, useState } from 'react';

/** Code128 barcode for one label; a dashed placeholder box when the variant has no barcode yet. */
export function BarcodeSvg({ value }: { value: string | null }) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [invalid, setInvalid] = useState(false);

    useEffect(() => {
        if (!value || !svgRef.current) return;

        setInvalid(!Code128.label.draw(svgRef.current, value));
    }, [value]);

    const missing = !value || invalid;

    return (
        <div className="qc-label__code">
            {/* The <svg> stays mounted so a corrected value can be drawn into it again. */}
            <svg ref={svgRef} className="qc-label__svg" style={missing ? { display: 'none' } : undefined} role="img" aria-label={value ? `Barcode ${value}` : undefined} />
            {missing && <div className="qc-label__missing">{value ? `BARCODE TIDAK VALID: ${value}` : 'BARCODE BELUM ADA'}</div>}
        </div>
    );
}
