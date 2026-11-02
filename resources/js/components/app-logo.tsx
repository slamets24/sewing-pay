import { cn } from '@/lib/utils';

export function AppLogo({
    className,
    subtitle = 'Divisi jahit & gudang',
    variant = 'default',
}: {
    className?: string;
    subtitle?: string;
    variant?: 'default' | 'on-dark';
}) {
    const onDark = variant === 'on-dark';

    return (
        <span className={cn('flex items-center gap-2.5', className)}>
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white p-0.5 shadow-xs border border-border/80">
                <img
                    src="/images/az-icon.png"
                    alt="AZFLOW"
                    className="size-full object-contain"
                />
            </span>
            <span className="flex flex-col justify-center leading-none">
                <span className="flex items-center gap-1.5">
                    <span className={cn('text-lg font-black tracking-tight font-display leading-none', onDark ? 'text-steel-foreground' : 'text-foreground')}>
                        OPSEW
                    </span>
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-primary uppercase leading-none">
                        by AZFLOW
                    </span>
                </span>
                <span className={cn('text-[11px] font-medium leading-normal text-muted-foreground mt-1', onDark ? 'text-steel-muted' : 'text-muted-foreground')}>
                    {subtitle}
                </span>
            </span>
        </span>
    );
}
