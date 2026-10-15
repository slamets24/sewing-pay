import { AppLogo } from '@/components/app-logo';
import { DisplaySettings } from '@/components/sewing/display-settings';
import { PayoutStatusBadge } from '@/components/sewing/payout/payout-status-badge';
import { SlipLineList } from '@/components/sewing/payout/slip-line-list';
import { StatementList } from '@/components/sewing/payout/statement-list';
import { Button } from '@/components/ui/button';
import { formatDate, formatDateTime, formatIdr, joinMeta } from '@/lib/format';
import type { PayoutSlipRecord } from '@/types/sewing';
import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import type { ReactNode } from 'react';

type PublicSlipProps = {
    slip: PayoutSlipRecord & { payout_code: string; cutoff_date: string };
};

/** Public slip a tailor opens from WhatsApp: no login, readable on a phone, prints cleanly on A4. */
export default function PublicPayoutSlip({ slip }: PublicSlipProps) {
    return (
        <div className="min-h-screen bg-background px-3 py-4 [-webkit-print-color-adjust:exact] [print-color-adjust:exact] sm:px-6 sm:py-8 print:bg-white print:p-0">
            <Head title="Slip gaji" />

            <article className="surface-card mx-auto max-w-3xl overflow-hidden print:max-w-none print:rounded-none print:border-0 print:shadow-none">
                <header className="sidebar-shell text-steel-foreground">
                    <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
                        <div className="flex items-center justify-between gap-3">
                            <AppLogo subtitle="Divisi jahit" variant="on-dark" />
                            <DisplaySettings className="border-white/20 bg-white/10 text-steel-foreground hover:bg-white/15 hover:text-steel-foreground print:hidden" />
                        </div>

                        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                            <div className="min-w-0">
                                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Slip gaji jahit</h1>
                                <p className="text-base break-all text-steel-muted">No. {slip.invoice_number}</p>
                            </div>
                            <PayoutStatusBadge status={slip.status} label={slip.status_label} solid />
                        </div>

                        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                            <HeaderItem label="Penjahit">
                                <span className="text-xl font-bold">{slip.tailor_name}</span>
                                {slip.tailor_code && <span className="text-steel-muted"> · {slip.tailor_code}</span>}
                            </HeaderItem>
                            <HeaderItem label="Pencairan">
                                {joinMeta(slip.payout_code, `s.d. ${formatDate(slip.cutoff_date)}`)}
                            </HeaderItem>
                            {slip.paid_at && <HeaderItem label="Dibayar">{formatDateTime(slip.paid_at)}</HeaderItem>}
                        </dl>
                    </div>
                </header>

                <div className="flex flex-col gap-6 px-4 py-5 sm:px-6">
                    <section className="flex flex-col items-start gap-1 rounded-lg border-2 border-primary bg-primary/10 px-4 py-4" aria-label="Total diterima">
                        <span className="text-base font-bold uppercase">Total diterima</span>
                        <span className="font-display text-4xl leading-none font-bold tabular min-[400px]:text-5xl sm:text-6xl">{formatIdr(slip.net_amount)}</span>
                    </section>

                    <section className="flex flex-col gap-3">
                        <h2 className="text-2xl font-bold uppercase">Ringkasan</h2>
                        <StatementList slip={slip} />
                    </section>

                    <section className="flex flex-col gap-3">
                        <h2 className="text-2xl font-bold uppercase">Rincian pekerjaan</h2>
                        <SlipLineList lines={slip.lines} />
                    </section>

                    {slip.notes && (
                        <section className="flex flex-col gap-2 rounded-lg border bg-muted/50 px-4 py-3">
                            <h2 className="text-xl font-bold uppercase">Catatan</h2>
                            <p className="text-base whitespace-pre-line">{slip.notes}</p>
                        </section>
                    )}

                    <footer className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">Slip ini dibuat otomatis. Kalau ada yang tidak sesuai, hubungi admin.</p>
                        <Button type="button" size="lg" className="print:hidden" onClick={() => window.print()}>
                            <Printer />
                            Cetak / simpan PDF
                        </Button>
                    </footer>
                </div>
            </article>
        </div>
    );
}

function HeaderItem({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-sm font-semibold tracking-wider text-steel-muted uppercase">{label}</dt>
            <dd className="text-base">{children}</dd>
        </div>
    );
}
