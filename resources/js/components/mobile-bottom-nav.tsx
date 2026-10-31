import { Navigation, type NavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';

/** One tab-width slice: top edge curves up in the middle for the floating active icon. */
const SCOOP_PATH = 'M0 52 V22 H26 C32 22 36 10 50 2 C64 10 68 22 74 22 H100 V52 Z';

type MobileBottomNavProps = {
    items: NavItem[];
};

export function MobileBottomNav({ items }: MobileBottomNavProps) {
    const count = items.length;
    if (count === 0) {
        return null;
    }

    const activeIndex = Math.max(
        0,
        items.findIndex((item) => Navigation.isActive(item)),
    );
    const segmentPercent = 100 / count;
    const bubbleLeft = (activeIndex + 0.5) * segmentPercent;
    const activeItem = items[activeIndex];
    const ActiveIcon = activeItem.icon;

    return (
        <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
            <div className="pointer-events-none mx-3 mb-3 pb-[env(safe-area-inset-bottom)]">
                <div className="pointer-events-auto relative h-[4.75rem]">
                    <div
                        className="absolute inset-x-0 bottom-0 top-6 rounded-[1.75rem] bg-card shadow-[var(--shadow-soft-lg)]"
                        aria-hidden
                    />

                    <div
                        className="absolute top-0 z-10 h-11 transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none"
                        style={{
                            width: `${segmentPercent}%`,
                            transform: `translateX(${activeIndex * 100}%)`,
                        }}
                        aria-hidden
                    >
                        <svg viewBox="0 0 100 52" preserveAspectRatio="none" className="h-full w-full text-card">
                            <path d={SCOOP_PATH} className="fill-card drop-shadow-sm" />
                        </svg>
                    </div>

                    <div
                        className="absolute top-0 z-20 flex -translate-x-1/2 flex-col items-center transition-[left] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none"
                        style={{ left: `${bubbleLeft}%` }}
                        aria-hidden
                    >
                        <div className="flex size-[3.35rem] items-center justify-center rounded-full bg-card shadow-[0_8px_20px_rgb(0,0,0,0.12)] ring-[5px] ring-background">
                            <span className="flex size-11 items-center justify-center rounded-full bg-primary/12 text-primary">
                                <ActiveIcon className="size-[1.35rem]" strokeWidth={2.25} />
                            </span>
                        </div>
                    </div>

                    <nav
                        aria-label="Menu cepat"
                        className="absolute inset-x-0 bottom-0 top-6 grid items-end pb-2.5"
                        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
                    >
                        {items.map((item, index) => {
                            const active = index === activeIndex;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.routeName}
                                    href={route(item.routeName)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex min-h-[3.25rem] flex-col items-center justify-end gap-0.5 px-0.5 text-[0.6875rem] leading-tight transition-[color,font-weight] duration-200',
                                        active ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
                                    )}
                                >
                                    {active ? (
                                        <span className="h-5 shrink-0" aria-hidden />
                                    ) : (
                                        <Icon className="mb-0.5 size-5 shrink-0" strokeWidth={1.75} />
                                    )}
                                    <span className="max-w-full truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="absolute inset-x-0 -bottom-1 flex justify-center pb-0.5" aria-hidden>
                        <span className="h-1 w-28 rounded-full bg-foreground/15" />
                    </div>
                </div>
            </div>
        </div>
    );
}
