import { Navigation, type NavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';

type MobileBottomNavProps = {
    items: NavItem[];
};

/** Menu bawah HP & tablet: label pendek, menu aktif ditandai latar tipis (tidak melayang menutupi isi halaman). */
export function MobileBottomNav({ items }: MobileBottomNavProps) {
    if (items.length === 0) {
        return null;
    }

    const activeIndex = items.findIndex((item) => Navigation.isActive(item));

    return (
        <nav
            aria-label="Menu cepat"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(15_23_42/0.06)] backdrop-blur lg:hidden"
        >
            <div className="mx-auto grid h-16 max-w-xl" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
                {items.map((item, index) => {
                    const active = index === activeIndex;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.routeName}
                            href={route(item.routeName)}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 text-[11px] leading-none transition-colors',
                                active ? 'font-bold text-primary' : 'font-medium text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', active && 'bg-primary/12')}>
                                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                            </span>
                            <span className="max-w-full truncate px-0.5">{item.shortLabel ?? item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
