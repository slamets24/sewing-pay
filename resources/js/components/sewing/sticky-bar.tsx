import type { ReactNode } from 'react';

/**
 * Save bar pinned above the phone's bottom menu (and to the bottom on desktop).
 * On phones the summary gets its own row so the buttons never squeeze it.
 */
export function StickyBar({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
    return (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t-2 border-primary bg-card/95 px-4 py-3 shadow-[0_-4px_12px_rgb(0_0_0/0.08)] backdrop-blur lg:bottom-0 lg:left-[17rem]">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1 basis-full sm:basis-0">
                    <p className="truncate font-display text-2xl font-bold tabular">{title}</p>
                    {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                <div className="flex flex-1 gap-2 sm:flex-none [&>*:last-child]:flex-1 sm:[&>*:last-child]:flex-none">{children}</div>
            </div>
        </div>
    );
}
