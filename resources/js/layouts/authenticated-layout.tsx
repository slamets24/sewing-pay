import { AppLogo } from '@/components/app-logo';
import { FlashToaster } from '@/components/flash-toaster';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, LogOut, Menu } from 'lucide-react';
import type { ReactNode } from 'react';

type NavItem = { label: string; routeName: string };

export default function AuthenticatedLayout({ header, children }: { header?: ReactNode; children: ReactNode }) {
    const user = usePage<SharedData>().props.auth.user!;

    const navItems: NavItem[] = [
        ...(user.role === 'superadmin' ? [{ label: 'Dashboard', routeName: 'dashboard' }] : []),
        { label: 'Admin Mobile', routeName: 'admin.mobile' },
    ];

    const logout = () => router.post(route('logout'));

    return (
        <div className="min-h-screen bg-background">
            <nav className="border-b border-border/60 bg-card/95 shadow-sm backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-6">
                        <Link href={route(user.home_route)}>
                            <AppLogo />
                        </Link>
                        <div className="hidden items-center gap-1 sm:flex">
                            {navItems.map((item) => (
                                <NavLink key={item.routeName} item={item} />
                            ))}
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="hidden sm:inline-flex">
                                {user.name}
                                <ChevronDown />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="flex flex-col">
                                <span>{user.name}</span>
                                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                                <span className="text-xs font-normal text-muted-foreground">{user.role_label}</span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={logout}>
                                <LogOut />
                                Keluar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Buka menu">
                                <Menu />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-72">
                            <SheetHeader>
                                <SheetTitle>{user.name}</SheetTitle>
                                <p className="text-sm text-muted-foreground">
                                    {user.email} · {user.role_label}
                                </p>
                            </SheetHeader>
                            <div className="flex flex-col gap-1 px-4">
                                {navItems.map((item) => (
                                    <NavLink key={item.routeName} item={item} />
                                ))}
                                <Button variant="ghost" className="justify-start" onClick={logout}>
                                    <LogOut />
                                    Keluar
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </nav>

            {header && (
                <header className="border-b border-border/60 bg-card/80">
                    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{header}</div>
                </header>
            )}

            <main>{children}</main>
            <FlashToaster />
        </div>
    );
}

function NavLink({ item }: { item: NavItem }) {
    const active = route().current(item.routeName);

    return (
        <Button asChild variant="ghost" className={cn('justify-start rounded-xl', active ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>
            <Link href={route(item.routeName)}>{item.label}</Link>
        </Button>
    );
}
