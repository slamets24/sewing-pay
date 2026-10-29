import qrcode from './qrcode-lib.mjs';

export class QrCode {
    /**
     * Generates a scalable SVG string for a QR code value.
     * Uses error correction level 'M' (standard 15% recovery) and quiet zone margin of 1 module.
     */
    static generateSvg(value: string, margin = 1): string | null {
        if (!value || !value.trim()) return null;

        try {
            // Type 0 = auto detect smallest type that fits
            const qr = qrcode(0, 'M');
            qr.addData(value);
            qr.make();
            return qr.createSvgTag({ scalable: true, margin });
        } catch {
            return null;
        }
    }
}
