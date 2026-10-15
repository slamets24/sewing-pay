import { cn } from '@/lib/utils';
import { Factory } from 'lucide-react';

export function AppLogo({
    className,
    subtitle,
    variant = 'default',
}: {
    className?: string;
    subtitle?: string;
    variant?: 'default' | 'on-dark';
}) {
    const onDark = variant === 'on-dark';

    return (
        <span className={cn('flex items-center gap-3', className)}>
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <Factory className="size-5" strokeWidth={1.75} />
            </span>
            <span className="flex flex-col leading-tight">
                <span className={cn('text-lg font-bold tracking-tight', onDark ? 'text-steel-foreground' : 'text-foreground')}>Sweing Pay</span>
                {subtitle && <span className={cn('text-xs font-medium', onDark ? 'text-steel-muted' : 'text-muted-foreground')}>{subtitle}</span>}
            </span>
        </span>
    );
}
