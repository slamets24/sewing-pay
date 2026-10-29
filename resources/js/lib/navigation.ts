import type { UserRole } from '@/types';
import {
    CalendarCheck,
    ClipboardList,
    HandPlatter,
    LayoutDashboard,
    PackageCheck,
    Scissors,
    Shirt,
    Truck,
    UserCog,
    Users,
    Wallet,
    Wrench,
    Zap,
    type LucideIcon,
} from 'lucide-react';

export type NavItem = {
    label: string;
    routeName: string;
    /** Route-name pattern that keeps the item highlighted on its sub-pages. */
    activePattern: string;
    icon: LucideIcon;
};

export type NavGroup = { label: string; items: NavItem[] };

const item = (label: string, routeName: string, icon: LucideIcon, activePattern?: string): NavItem => ({
    label,
    routeName,
    icon,
    activePattern: activePattern ?? routeName,
});

const WORKFLOW: NavItem[] = [
    item('Beranda', 'dashboard', LayoutDashboard),
    item('Loket Cepat', 'desk.index', Zap, 'desk.*'),
    item('Ambil', 'pickups.create', HandPlatter, 'pickups.*'),
    item('Setor', 'deliveries.index', PackageCheck, 'deliveries.*'),
    item('WO', 'work-orders.index', ClipboardList, 'work-orders.*'),
    item('Absensi', 'attendances.index', CalendarCheck, 'attendances.*'),
    item('Kirim QC', 'qc-shipments.index', Truck, 'qc-shipments.*'),
    item('Catat Revisi', 'revisions.index', Wrench, 'revisions.*'),
];

/** Which menu each role sees, and which few items sit in the phone's bottom bar. */
export class Navigation {
    private constructor(
        readonly groups: NavGroup[],
        readonly bottomBar: NavItem[],
    ) {}

    static forRole(role: UserRole): Navigation {
        switch (role) {
            case 'superadmin':
                return new Navigation(
                    [
                        { label: 'Alur Kerja Divisi', items: WORKFLOW },
                        {
                            label: 'Master & Gaji',
                            items: [
                                item('Gaji', 'payouts.index', Wallet, 'payouts.*'),
                                item('Artikel & tarif', 'articles.index', Shirt),
                                item('Penjahit', 'tailors.index', Users),
                                item('Bagian revisi', 'revision-parts.index', Scissors),
                                item('Pengguna', 'users.index', UserCog),
                            ],
                        },
                    ],
                    WORKFLOW.slice(0, 5),
                );
            case 'admin':
                return new Navigation(
                    [
                        { label: 'Alur Kerja Divisi', items: WORKFLOW },
                        { label: 'Data', items: [item('Artikel', 'articles.index', Shirt)] },
                    ],
                    WORKFLOW.slice(0, 5),
                );
            case 'qc':
            case 'penjahit':
                return new Navigation([], []);
        }
    }

    get allItems(): NavItem[] {
        return this.groups.flatMap((group) => group.items);
    }

    static isActive(item: NavItem): boolean {
        return route().current(item.activePattern) === true;
    }
}
