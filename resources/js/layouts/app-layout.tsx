import { AppLogo } from '@/components/app-logo';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { FlashToaster } from '@/components/flash-toaster';
import { DisplaySettings } from '@/components/sewing/display-settings';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Navigation, type NavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { LogOut, Menu } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

type AppLayoutProps = {
    title: string;
    children: ReactNode;
};

/** Shell for every signed-in page: gradient sidebar on desktop, top bar + bottom tab bar on phones. */
export default function AppLayout({ title, children }: AppLayoutProps) {
    const user = usePage<SharedData>().props.auth.user!;
    const navigation = useMemo(() => Navigation.forRole(user.role), [user.role]);
    const logout = () => router.post(route('logout'));

    return (
        <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:gap-0">
            <Head title={title} />

            <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-card px-4 py-6 lg:flex">
                <Link href={route(user.home_route)} className="mb-8 px-2">
                    <AppLogo subtitle="Divisi jahit & gudang" variant="default" />
                </Link>
                <nav className="flex flex-1 flex-col gap-6 overflow-y-auto" aria-label="Menu utama">
                    <NavGroups navigation={navigation} />
                </nav>
                <UserBox name={user.name} roleLabel={user.role_label} onLogout={logout} />
            </aside>

            <div className="flex min-w-0 flex-col lg:py-3 lg:pr-3">
                <header className="sticky top-0 z-30 border-b border-border bg-card text-foreground shadow-xs lg:top-3 lg:rounded-xl lg:border">
                    <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:h-16">
                        <Link href={route(user.home_route)} className="lg:hidden" aria-label="Ke beranda">
                            <AppLogoMark />
                        </Link>
                        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight lg:text-2xl">{title}</h1>
                        <DisplaySettings />
                        <MobileMenu navigation={navigation} name={user.name} roleLabel={user.role_label} onLogout={logout} />
                    </div>
                </header>

                <main
                    className={cn(
                        'mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8',
                        navigation.bottomBar.length > 0 ? 'pb-36 lg:pb-10' : 'pb-10',
                    )}
                >
                    {children}
                </main>
            </div>

            {navigation.bottomBar.length > 0 && <MobileBottomNav items={navigation.bottomBar} />}
            <FlashToaster />
        </div>
    );
}

function AppLogoMark() {
    return (
        <span className="flex size-9 items-center justify-center rounded-lg overflow-hidden border border-border/80 bg-white p-0.5 shadow-xs">
            <img src="/images/az-icon.png" alt="OPSEW" className="size-full object-contain" />
        </span>
    );
}

function NavGroups({ navigation, onNavigate }: { navigation: Navigation; onNavigate?: () => void }) {
    return navigation.groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
            <p className="px-3 text-[11px] font-bold tracking-wider text-muted-foreground/80 uppercase">{group.label}</p>
            {group.items.map((item) => (
                <SideLink key={item.routeName} item={item} onNavigate={onNavigate} />
            ))}
        </div>
    ));
}

function SideLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
    const active = Navigation.isActive(item);
    const Icon = item.icon;

    return (
        <Link
            href={route(item.routeName)}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                active
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )}
        >
            <Icon className={cn('size-4.5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} strokeWidth={active ? 2.25 : 1.75} />
            {item.label}
        </Link>
    );
}

function UserBox({ name, roleLabel, onLogout }: { name: string; roleLabel: string; onLogout: () => void }) {
    return (
        <div className="mt-auto flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onLogout} aria-label="Keluar">
                <LogOut className="size-4.5" strokeWidth={1.75} />
            </Button>
        </div>
    );
}

function MobileMenu({ navigation, name, roleLabel, onLogout }: { navigation: Navigation; name: string; roleLabel: string; onLogout: () => void }) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu">
                    <Menu className="size-6" strokeWidth={1.75} />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 border-l border-border bg-card p-0 text-foreground">
                <SheetHeader className="px-6 pt-6">
                    <SheetTitle>
                        <AppLogo subtitle="Divisi jahit & gudang" variant="default" />
                    </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6" aria-label="Menu">
                    <NavGroups navigation={navigation} />
                </nav>
                <div className="px-4 pb-6">
                    <UserBox name={name} roleLabel={roleLabel} onLogout={onLogout} />
                </div>
            </SheetContent>
        </Sheet>
    );
}

