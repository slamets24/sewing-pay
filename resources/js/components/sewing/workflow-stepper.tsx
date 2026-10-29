import { ToneStyle, type Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    ClipboardList,
    PackageCheck,
    Scissors,
    Truck,
    Warehouse,
    Wrench,
    type LucideIcon,
} from 'lucide-react';

export type WorkflowStats = {
    pending_qty: number;
    available_qty: number;
    sewing_qty: number;
    delivered_today_qty: number;
    unshipped_qty: number;
    revisions_open: number;
};

type StepDef = {
    step: number;
    title: string;
    actionLabel: string;
    qtyLabel: string;
    hint: string;
    icon: LucideIcon;
    tone: Tone;
    href: string;
    attention?: boolean;
};

export function WorkflowStepper({ stats }: { stats: WorkflowStats }) {
    const steps: StepDef[] = [
        {
            step: 1,
            title: 'WO & Cutting',
            actionLabel: 'Input WO',
            qtyLabel: `${stats.pending_qty} pcs`,
            hint: 'Di print / cutting',
            icon: ClipboardList,
            tone: 'other',
            href: route('work-orders.index'),
        },
        {
            step: 2,
            title: 'Hancaan Masuk',
            actionLabel: 'Siap Diambil',
            qtyLabel: `${stats.available_qty} pcs`,
            hint: 'Ada di gudang jahit',
            icon: Warehouse,
            tone: 'ready',
            href: route('pickups.create'),
            attention: stats.available_qty > 0,
        },
        {
            step: 3,
            title: 'Penjahit Ambil',
            actionLabel: 'Catat Ambil',
            qtyLabel: `${stats.sewing_qty} pcs`,
            hint: 'Sedang dikerjakan',
            icon: Scissors,
            tone: 'sewing',
            href: route('deliveries.index'),
        },
        {
            step: 4,
            title: 'Setor Jahitan',
            actionLabel: 'Catat Setor',
            qtyLabel: `${stats.delivered_today_qty} pcs`,
            hint: 'Disetor hari ini',
            icon: PackageCheck,
            tone: 'done',
            href: route('deliveries.index'),
        },
        {
            step: 5,
            title: 'Kirim ke QC',
            actionLabel: 'Cetak & Kirim',
            qtyLabel: `${stats.unshipped_qty} pcs`,
            hint: 'Menunggu dikirim ke QC',
            icon: Truck,
            tone: 'qc',
            href: route('qc-shipments.index'),
            attention: stats.unshipped_qty > 0,
        },
        {
            step: 6,
            title: 'Catat Revisi',
            actionLabel: 'Cek Revisi',
            qtyLabel: `${stats.revisions_open} revisi`,
            hint: 'Temuan QC / cacat bahan',
            icon: Wrench,
            tone: 'revision',
            href: route('revisions.index'),
            attention: stats.revisions_open > 0,
        },
    ];

    return (
        <section className="surface-card flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                        Alur Kerja Produksi Divisi Jahit
                    </h2>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                        Alur pengerjaan berurutan yang dicatat oleh Admin Divisi — klik langkah untuk langsung membuka halamannya.
                    </p>
                </div>
                <span className="self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:self-auto">
                    Internal Divisi Jahit
                </span>
            </div>

            {/* Steps Container: horizontal scroll on small devices, 6-col grid on wide screens */}
            <div className="flex items-stretch gap-2 overflow-x-auto pb-2 pt-1 lg:grid lg:grid-cols-6 lg:gap-3 lg:overflow-visible lg:pb-0">
                {steps.map((item, index) => {
                    const Icon = item.icon;
                    const isLast = index === steps.length - 1;

                    return (
                        <div key={item.step} className="flex min-w-[13.5rem] flex-1 items-stretch lg:min-w-0">
                            <Link
                                href={item.href}
                                className={cn(
                                    'group relative flex w-full flex-col justify-between gap-3 rounded-xl border p-3 transition-all',
                                    'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                    item.attention ? 'border-primary/40 bg-card shadow-xs' : 'bg-muted/30 hover:bg-card'
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary">
                                        {item.step}
                                    </span>
                                    <span className={cn('flex size-8 items-center justify-center rounded-lg', ToneStyle.soft(item.tone))}>
                                        <Icon className="size-4" strokeWidth={2} />
                                    </span>
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {item.title}
                                    </span>
                                    <span className="text-xl font-bold tracking-tight tabular text-foreground">
                                        {item.qtyLabel}
                                    </span>
                                    <span className="text-[0.75rem] text-muted-foreground leading-tight">
                                        {item.hint}
                                    </span>
                                </div>

                                <div className="mt-1 flex items-center justify-between border-t border-border/50 pt-2 text-xs font-semibold text-primary">
                                    <span>{item.actionLabel}</span>
                                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                                </div>
                            </Link>

                            {/* Arrow indicator between steps on desktop */}
                            {!isLast && (
                                <div className="hidden items-center justify-center px-1 text-muted-foreground/30 lg:flex" aria-hidden>
                                    <ArrowRight className="size-4" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
