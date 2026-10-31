import { cn } from '@/lib/utils';

export function AppLogo({
    className,
    subtitle = 'Operasional & Gudang Jahit',
    variant = 'default',
}: {
    className?: string;
    subtitle?: string;
    variant?: 'default' | 'on-dark';
}) {
    const onDark = variant === 'on-dark';

    return (
        <span className={cn('flex items-center gap-3', className)}>
            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-xs border border-border/80">
                <img
                    src="/images/az-icon.png"
                    alt="AZFLOW"
                    className="size-full object-contain"
                />
            </span>
            <span className="flex flex-col leading-tight">
                <span className="flex items-center gap-1.5">
                    <span className={cn('text-lg font-black tracking-tight font-display', onDark ? 'text-steel-foreground' : 'text-foreground')}>
                        OPSEW
                    </span>
                    <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-extrabold text-primary tracking-wider uppercase">
                        OPS
                    </span>
                </span>
                <span className={cn('text-[11px] font-medium leading-none mt-0.5', onDark ? 'text-steel-muted' : 'text-muted-foreground')}>
                    {subtitle}
                </span>
                <span className="text-[9px] font-bold text-primary tracking-wider uppercase mt-1">
                    powered by AZFLOW
                </span>
            </span>
        </span>
    );
}
