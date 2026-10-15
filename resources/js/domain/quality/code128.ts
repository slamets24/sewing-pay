import JsBarcode from 'jsbarcode';

type Code128Style = {
    /** Width of the thinnest bar, in SVG units. The SVG is scaled to the label with CSS afterwards. */
    moduleWidth: number;
    barHeight: number;
    fontSize: number;
};

/**
 * Draws Code128 barcodes — the symbology the packing scanner reads — into an <svg>.
 * Keeps the 10-module quiet zone on both sides so cheap scanners still lock on.
 */
export class Code128 {
    static readonly label = new Code128({ moduleWidth: 2, barHeight: 56, fontSize: 18 });

    private constructor(private readonly style: Code128Style) {}

    /** Renders the value; returns false when it cannot be encoded (e.g. non-ASCII characters). */
    draw(svg: SVGSVGElement, value: string): boolean {
        let valid = true;
        const quietZone = this.style.moduleWidth * 10;

        try {
            JsBarcode(svg, value, {
                format: 'CODE128',
                displayValue: true,
                width: this.style.moduleWidth,
                height: this.style.barHeight,
                fontSize: this.style.fontSize,
                font: 'monospace',
                textMargin: 2,
                margin: 0,
                marginLeft: quietZone,
                marginRight: quietZone,
                background: '#ffffff',
                lineColor: '#000000',
                valid: (ok: boolean) => {
                    valid = ok;
                },
            });
        } catch {
            valid = false;
        }

        if (!valid) svg.replaceChildren();

        return valid;
    }
}
