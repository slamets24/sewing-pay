import type { LabelSize } from '@/domain/quality/label-sheet';

/*
 * Label CSS lives here (not in Tailwind classes) because print needs exact millimetres and points.
 * On screen the labels are drawn larger and fluid so they stay readable on a phone;
 * the @media print block switches to the real paper size the admin picked.
 */
const SCREEN = `
.qc-sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr)); gap: 1rem; }
.qc-label { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 1rem; min-width: 0; overflow: hidden; padding: 1rem 1.25rem; border: 1px dashed var(--input); border-radius: var(--radius); background: #ffffff; color: #000000; line-height: 1.25; break-inside: avoid; page-break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.qc-label p { margin: 0; overflow-wrap: anywhere; }
.qc-label__left { flex: none; display: flex; flex-direction: column; align-items: center; width: 6.5rem; }
.qc-label__code { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 0.35rem; }
.qc-label__qr { width: 5.5rem; height: 5.5rem; }
.qc-label__qr svg { display: block; width: 100%; height: 100%; shape-rendering: crispEdges; }
.qc-label__barcode-text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.6875rem; font-weight: 700; letter-spacing: -0.01em; text-align: center; line-height: 1.1; word-break: break-all; color: #111111; }
.qc-label__missing { display: flex; align-items: center; justify-content: center; width: 5.5rem; height: 5.5rem; padding: 0.25rem; border: 2px dashed #999999; font-size: 0.625rem; font-weight: 700; text-align: center; color: #666666; }
.qc-label__right { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 0.2rem; }
.qc-label__brand { font-size: 1.125rem; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; color: #000000; line-height: 1.15; }
.qc-label__article { font-size: 1.25rem; font-weight: 700; color: #000000; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.qc-label__variant { font-size: 0.9375rem; font-weight: 500; color: #333333; line-height: 1.2; }
.qc-label__tailor { font-size: 0.875rem; font-weight: 600; color: #222222; margin-top: 0.15rem; line-height: 1.2; }
`;

const PRINT_COMMON = `
html, body { background: #fff !important; }
[data-sonner-toaster] { display: none !important; }
.qc-label { border-radius: 0; background: #fff !important; color: #000 !important; box-shadow: none !important; }
.qc-label__qr svg { shape-rendering: crispEdges; }
`;

const PRINT: Record<LabelSize, string> = {
    a4: `
@page { size: A4; margin: 8mm; }
.qc-summary { break-after: page; page-break-after: always; }
.qc-sheet { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; }
.qc-label { height: 39mm; padding: 2.5mm 3.5mm; display: flex; flex-direction: row; align-items: center; gap: 3.5mm; border: 0.25mm dashed #888888; box-sizing: border-box; }
.qc-label__left { width: 23mm; display: flex; flex-direction: column; align-items: center; flex: none; }
.qc-label__code { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 0.8mm; }
.qc-label__qr { width: 21mm; height: 21mm; }
.qc-label__barcode-text { font-size: 6.5pt; font-weight: 700; text-align: center; line-height: 1; letter-spacing: -0.01em; }
.qc-label__missing { width: 21mm; height: 21mm; font-size: 6.5pt; border-width: 0.3mm; }
.qc-label__right { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 0.8mm; }
.qc-label__brand { font-size: 9.5pt; font-weight: 800; line-height: 1.15; letter-spacing: 0.02em; }
.qc-label__article { font-size: 10.5pt; font-weight: 700; line-height: 1.15; }
.qc-label__variant { font-size: 8pt; font-weight: 500; line-height: 1.15; }
.qc-label__tailor { font-size: 8pt; font-weight: 600; line-height: 1.15; }
`,
    thermal: `
@page { size: 50mm 30mm; margin: 0; }
.qc-summary { display: none !important; }
.qc-sheet { display: block; }
.qc-label { width: 50mm; height: 30mm; padding: 2mm 3mm; display: flex; flex-direction: row; align-items: center; gap: 2.5mm; border: 0; break-after: page; page-break-after: always; box-sizing: border-box; }
.qc-label:last-child { break-after: auto; page-break-after: auto; }
.qc-label__left { width: 17.5mm; display: flex; flex-direction: column; align-items: center; flex: none; }
.qc-label__code { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 0.5mm; }
.qc-label__qr { width: 16.5mm; height: 16.5mm; }
.qc-label__barcode-text { font-size: 4.8pt; font-weight: 700; text-align: center; line-height: 1; letter-spacing: -0.02em; }
.qc-label__missing { width: 16.5mm; height: 16.5mm; font-size: 5pt; border-width: 0.3mm; }
.qc-label__right { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 0.5mm; }
.qc-label__brand { font-size: 7.5pt; font-weight: 800; line-height: 1.1; letter-spacing: 0.02em; }
.qc-label__article { font-size: 8.5pt; font-weight: 700; line-height: 1.1; -webkit-line-clamp: 1; }
.qc-label__variant { font-size: 6.5pt; font-weight: 500; line-height: 1.1; }
.qc-label__tailor { font-size: 6.5pt; font-weight: 600; line-height: 1.1; }
`,
};

export function LabelPrintStyle({ size }: { size: LabelSize }) {
    return <style>{`${SCREEN}\n@media print {${PRINT_COMMON}${PRINT[size]}}`}</style>;
}
