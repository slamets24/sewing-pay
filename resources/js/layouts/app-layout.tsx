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

            <aside className="sidebar-shell sticky top-0 hidden h-screen flex-col px-4 py-6 lg:flex">
                <Link href={route(user.home_route)} className="mb-8 px-2">
                    <AppLogo subtitle="Divisi jahit" variant="on-dark" />
                </Link>
                <nav className="flex flex-1 flex-col gap-6 overflow-y-auto" aria-label="Menu utama">
                    <NavGroups navigation={navigation} />
                </nav>
                <UserBox name={user.name} roleLabel={user.role_label} onLogout={logout} />
            </aside>

            <div className="flex min-w-0 flex-col lg:py-3 lg:pr-3">
                <header className="sticky top-0 z-30 border-b border-border/60 bg-card/95 text-foreground shadow-sm backdrop-blur-md lg:top-3 lg:rounded-2xl lg:border">
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
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <span className="text-sm font-bold">SP</span>
        </span>
    );
}

function NavGroups({ navigation, onNavigate }: { navigation: Navigation; onNavigate?: () => void }) {
    return navigation.groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
            <p className="px-3 text-[0.65rem] font-semibold tracking-widest text-steel-muted uppercase">{group.label}</p>
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
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                active ? 'bg-steel-accent text-steel-foreground shadow-sm' : 'text-steel-foreground/85 hover:bg-steel-accent/70',
            )}
        >
            <Icon className={cn('size-5 shrink-0', active ? 'text-steel-foreground' : 'text-steel-muted')} strokeWidth={1.75} />
            {item.label}
        </Link>
    );
}

function UserBox({ name, roleLabel, onLogout }: { name: string; roleLabel: string; onLogout: () => void }) {
    return (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-steel-accent/80 px-3 py-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-sm font-bold">
                {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-steel-muted">{roleLabel}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-steel-foreground hover:bg-white/15 hover:text-steel-foreground" onClick={onLogout} aria-label="Keluar">
                <LogOut className="size-5" strokeWidth={1.75} />
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
            <SheetContent side="right" className="sidebar-shell w-80 border-0 p-0 text-steel-foreground">
                <SheetHeader className="px-6 pt-6">
                    <SheetTitle className="text-steel-foreground">
                        <AppLogo subtitle="Divisi jahit" variant="on-dark" />
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

