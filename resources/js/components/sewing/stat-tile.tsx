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
        <div className="surface-card flex h-full flex-col gap-2.5 p-4 transition-colors group-hover:border-foreground/25">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                <span className={cn('flex size-9 items-center justify-center rounded-lg', ToneStyle.soft(tone))}>
                    <Icon className="size-4.5" strokeWidth={1.75} />
                </span>
            </div>
            <span className="text-3xl leading-none font-bold tracking-tight tabular lg:text-4xl">{value}</span>
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
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
