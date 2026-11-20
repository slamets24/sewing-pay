import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/**
 * Save bar pinned above the phone's bottom menu (and to the bottom on desktop).
 * Phones get one compact row (summary + buttons); pages with many buttons pass `stackOnPhone`
 * so the summary gets its own row and the buttons never squeeze it.
 */
export function StickyBar({ title, subtitle, children, stackOnPhone = false }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; stackOnPhone?: boolean }) {
    return (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t-2 border-primary bg-card/95 px-4 py-2.5 shadow-[0_-4px_12px_rgb(0_0_0/0.08)] backdrop-blur sm:py-3 lg:bottom-0 lg:left-[17rem]">
            <div className={cn('mx-auto flex max-w-6xl items-center gap-x-3 gap-y-2', stackOnPhone && 'flex-wrap')}>
                <div className={cn('min-w-0 flex-1', stackOnPhone && 'basis-full sm:basis-0')}>
                    <p className="truncate font-display text-lg leading-tight font-bold tabular sm:text-2xl">{title}</p>
                    {subtitle && <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
                </div>
                <div className={cn('flex flex-none gap-2', stackOnPhone && 'flex-1 sm:flex-none [&>*:last-child]:flex-1 sm:[&>*:last-child]:flex-none')}>{children}</div>
            </div>
        </div>
    );
}
