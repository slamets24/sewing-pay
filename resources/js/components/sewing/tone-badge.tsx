import { ToneStyle, type Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ReactNode } from 'react';

/** Pill with a colored dot, always paired with text so color is never the only signal. */
export function ToneBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
    return (
        <Badge variant="outline" className={cn('gap-1.5 overflow-visible rounded-md px-2 py-0.5 text-xs font-medium tracking-normal', ToneStyle.soft(tone), className)}>
            <span className={cn('size-2 rounded-full', ToneStyle.solid(tone))} aria-hidden />
            {children}
        </Badge>
    );
}
