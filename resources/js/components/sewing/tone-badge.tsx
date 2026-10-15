import { ToneStyle, type Tone } from '@/lib/tone';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Pill with a colored dot, always paired with text so color is never the only signal. */
export function ToneBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
    return (
        <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap', ToneStyle.soft(tone), className)}>
            <span className={cn('size-2 rounded-full', ToneStyle.solid(tone))} aria-hidden />
            {children}
        </span>
    );
}
