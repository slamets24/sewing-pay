import type { UserRole } from '@/types';
import {
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

const FLOOR: NavItem[] = [
    item('Beranda', 'dashboard', LayoutDashboard),
    item('WO', 'work-orders.index', ClipboardList, 'work-orders.*'),
    item('Ambil', 'pickups.create', HandPlatter, 'pickups.*'),
    item('Setor', 'deliveries.index', PackageCheck, 'deliveries.*'),
    item('Kirim QC', 'qc-shipments.index', Truck, 'qc-shipments.*'),
];

const QUALITY: NavItem[] = [item('Revisi dari QC', 'revisions.index', Wrench, 'revisions.*')];

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
                        { label: 'Produksi', items: FLOOR },
                        { label: 'Revisi', items: QUALITY },
                        {
                            label: 'Owner',
                            items: [
                                item('Gaji', 'payouts.index', Wallet, 'payouts.*'),
                                item('Artikel & tarif', 'articles.index', Shirt),
                                item('Penjahit', 'tailors.index', Users),
                                item('Bagian revisi', 'revision-parts.index', Scissors),
                                item('Pengguna', 'users.index', UserCog),
                            ],
                        },
                    ],
                    FLOOR.slice(0, 4),
                );
            case 'admin':
                return new Navigation(
                    [
                        { label: 'Produksi', items: FLOOR },
                        { label: 'Revisi', items: QUALITY },
                        { label: 'Data', items: [item('Artikel', 'articles.index', Shirt)] },
                    ],
                    FLOOR.slice(0, 4),
                );
            case 'qc':
                return new Navigation([{ label: 'Revisi', items: QUALITY }], []);
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
