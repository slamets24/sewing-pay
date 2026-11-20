import { ToneStyle, type Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

type StatTileProps = {
    label: string;
    value: string | number;
    icon: LucideIcon;
    tone: Tone;
    hint?: string;
    href?: string;
};

/** Dashboard metric tile with clean industrial card and tinted icon. */
export function StatTile({ label, value, icon: Icon, tone, hint, href }: StatTileProps) {
    const body = (
        <div className="surface-card flex h-full flex-col gap-1.5 p-3 transition-colors group-hover:border-foreground/25 sm:gap-2.5 sm:p-4">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
                <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg sm:size-9', ToneStyle.soft(tone))}>
                    <Icon className="size-4 sm:size-4.5" strokeWidth={1.75} />
                </span>
            </div>
            <span className="text-xl leading-none font-bold tracking-tight tabular sm:text-3xl lg:text-4xl">{value}</span>
            {hint && <span className="line-clamp-2 text-[11px] text-muted-foreground sm:text-xs">{hint}</span>}
        </div>
    );

    return href ? (
        <Link href={href} className="group block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            {body}
        </Link>
    ) : (
        body
    );
}
