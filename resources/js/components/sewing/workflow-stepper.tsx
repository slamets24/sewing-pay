import { Card } from '@/components/ui/card';
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
        <Card asChild>
            <section className=" flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                            Alur Kerja Produksi Divisi Jahit
                        </h2>
                        <p className="hidden text-xs text-muted-foreground sm:block sm:text-sm">
                            Alur pengerjaan berurutan yang dicatat oleh Admin Divisi — klik langkah untuk langsung membuka halamannya.
                        </p>
                    </div>
                    <span className="hidden self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:inline sm:self-auto">
                        Internal Divisi Jahit
                    </span>
                </div>

                {/* HP: grid 2 kolom (tidak perlu geser); tablet: geser ke samping; laptop: 6 kolom. */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-stretch sm:overflow-x-auto sm:pt-1 sm:pb-2 lg:grid lg:grid-cols-6 lg:gap-3 lg:overflow-visible lg:pb-0">
                    {steps.map((item, index) => {
                        const Icon = item.icon;
                        const isLast = index === steps.length - 1;

                        return (
                            <div key={item.step} className="flex min-w-0 flex-1 items-stretch sm:min-w-[13.5rem] lg:min-w-0">
                                <Card asChild>
                                <Link
                                        href={item.href}
                                        className={cn(
                                            'group relative flex w-full flex-col justify-between gap-2 border p-2.5 transition-colors sm:gap-3 sm:p-3',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                            item.attention ? 'border-primary/50 bg-card ' : 'border-border/70 bg-muted/30 hover:bg-card hover:border-foreground/30'
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
                                            <span className="text-[11px] leading-tight font-semibold tracking-wider text-muted-foreground uppercase sm:text-xs">
                                                {item.title}
                                            </span>
                                            <span className="text-lg font-bold tracking-tight tabular text-foreground sm:text-xl">
                                                {item.qtyLabel}
                                            </span>
                                            <span className="text-[0.75rem] text-muted-foreground leading-tight">
                                                {item.hint}
                                            </span>
                                        </div>

                                        <div className="mt-1 hidden items-center justify-between border-t border-border/50 pt-2 text-xs font-semibold text-primary sm:flex">
                                            <span>{item.actionLabel}</span>
                                            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                                        </div>
                                    </Link>
                            </Card>

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
        </Card>
    );
}
