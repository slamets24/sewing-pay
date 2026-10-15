import type { LabelSize } from '@/domain/quality/label-sheet';

/*
 * Label CSS lives here (not in Tailwind classes) because print needs exact millimetres and points.
 * On screen the labels are drawn larger and fluid so they stay readable on a phone;
 * the @media print block switches to the real paper size the admin picked.
 */
const SCREEN = `
.qc-sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); gap: 0.75rem; }
.qc-label { box-sizing: border-box; display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; overflow: hidden; padding: 0.75rem; border: 1px dashed var(--input); border-radius: var(--radius); background: var(--card); color: var(--card-foreground); line-height: 1.2; break-inside: avoid; page-break-inside: avoid; }
.qc-label p { margin: 0; overflow-wrap: anywhere; }
.qc-label__code { flex: none; display: flex; align-items: center; justify-content: center; height: 5.5rem; background: #fff; }
.qc-label__svg { display: block; width: 100%; height: 100%; }
.qc-label__missing { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; padding: 0 0.25rem; border: 2px dashed currentColor; font-size: 0.875rem; font-weight: 700; letter-spacing: 0.04em; text-align: center; }
.qc-label__article { font-size: 1.125rem; font-weight: 700; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.qc-label__variant { font-size: 1rem; font-weight: 600; }
.qc-label__meta, .qc-label__foot { font-size: 0.875rem; }
.qc-label__foot { display: flex; justify-content: space-between; gap: 0.5rem; margin-top: auto; font-weight: 600; }
`;

const PRINT_COMMON = `
html, body { background: #fff !important; }
[data-sonner-toaster] { display: none !important; }
.qc-label { border-radius: 0; background: #fff; color: #000; }
.qc-label__missing { border-width: 0.4mm; }
`;

const PRINT: Record<LabelSize, string> = {
    a4: `
@page { size: A4; margin: 8mm; }
.qc-summary { break-after: page; page-break-after: always; }
.qc-sheet { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; }
.qc-label { height: 39mm; padding: 2mm 3mm; gap: 0.6mm; border: 0.25mm dashed #888; }
.qc-label__code { height: 15mm; }
.qc-label__missing { font-size: 8pt; }
.qc-label__article { font-size: 10pt; }
.qc-label__variant { font-size: 9pt; }
.qc-label__meta { font-size: 7.5pt; }
.qc-label__foot { font-size: 7pt; }
`,
    thermal: `
@page { size: 50mm 30mm; margin: 0; }
.qc-summary { display: none !important; }
.qc-sheet { display: block; }
.qc-label { width: 50mm; height: 30mm; padding: 1.2mm 2mm; gap: 0.3mm; border: 0; break-after: page; page-break-after: always; }
.qc-label:last-child { break-after: auto; page-break-after: auto; }
.qc-label__code { height: 12mm; }
.qc-label__missing { font-size: 6.5pt; }
.qc-label__article { font-size: 7.5pt; -webkit-line-clamp: 1; }
.qc-label__variant { font-size: 7pt; }
.qc-label__meta { font-size: 6pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qc-label__foot { font-size: 6pt; }
`,
};

export function LabelPrintStyle({ size }: { size: LabelSize }) {
    return <style>{`${SCREEN}\n@media print {${PRINT_COMMON}${PRINT[size]}}`}</style>;
}
