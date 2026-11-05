import type { UserRole } from '@/types';
import {
    BarChart3,
    CalendarCheck,
    ClipboardList,
    HandPlatter,
    LayoutDashboard,
    PackageCheck,
    Receipt,
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

export const DASHBOARD_ITEM = item('Dashboard', 'dashboard', LayoutDashboard);

// 1. Operasional Meja / Loket
const LOKET_ITEMS: NavItem[] = [
    item('Loket Cepat', 'desk.index', Zap, 'desk.*'),
    item('Ambil Barang', 'pickups.create', HandPlatter, 'pickups.*'),
    item('Setor Jahitan', 'deliveries.index', PackageCheck, 'deliveries.*'),
];

// 2. Produksi & Kontrol Kualitas
const PRODUCTION_ITEMS: NavItem[] = [
    item('Work Order (WO)', 'work-orders.index', ClipboardList, 'work-orders.*'),
    item('Rekap Produksi', 'production-reports.index', BarChart3, 'production-reports.*'),
    item('Kirim ke QC', 'qc-shipments.index', Truck, 'qc-shipments.*'),
    item('Catat Revisi', 'revisions.index', Wrench, 'revisions.*'),
];

// 3. Kepegawaian & Penjahit
const TAILOR_ITEMS: NavItem[] = [
    item('Kehadiran', 'attendances.index', CalendarCheck, 'attendances.*'),
    item('Data Penjahit', 'tailors.index', Users, 'tailors.*'),
];

// 4. Keuangan & Gaji
const PAYROLL_ITEMS: NavItem[] = [
    item('Gaji Penjahit', 'payouts.index', Wallet, 'payouts.*'),
    item('Pembayaran Maklun', 'makloon-payments.index', Receipt, 'makloon-payments.*'),
];

// 5. Master Data & Pengaturan
const MASTER_ITEMS: NavItem[] = [
    item('Artikel & Tarif', 'articles.index', Shirt, 'articles.*'),
    item('Bagian Revisi', 'revision-parts.index', Scissors, 'revision-parts.*'),
    item('Pengguna Sistem', 'users.index', UserCog, 'users.*'),
];

/** Which menu each role sees, grouped by operational context. */
export class Navigation {
    private constructor(
        readonly topItem: NavItem | null,
        readonly groups: NavGroup[],
        readonly bottomBar: NavItem[],
    ) {}

    static forRole(role: UserRole): Navigation {
        switch (role) {
            case 'superadmin':
                return new Navigation(
                    DASHBOARD_ITEM,
                    [
                        { label: 'Operasional Loket', items: LOKET_ITEMS },
                        { label: 'Produksi & QC', items: PRODUCTION_ITEMS },
                        { label: 'Kepegawaian', items: TAILOR_ITEMS },
                        { label: 'Keuangan & Gaji', items: PAYROLL_ITEMS },
                        { label: 'Master Data', items: MASTER_ITEMS },
                    ],
                    [
                        DASHBOARD_ITEM,
                        LOKET_ITEMS[0],
                        PRODUCTION_ITEMS[1],
                        LOKET_ITEMS[2],
                        LOKET_ITEMS[1],
                    ],
                );
            case 'admin':
                return new Navigation(
                    DASHBOARD_ITEM,
                    [
                        { label: 'Operasional Loket', items: LOKET_ITEMS },
                        { label: 'Produksi & QC', items: PRODUCTION_ITEMS },
                        { label: 'Kepegawaian', items: TAILOR_ITEMS },
                        { label: 'Data', items: [item('Artikel & Tarif', 'articles.index', Shirt), item('Pengguna Sistem', 'users.index', UserCog, 'users.*')] },
                    ],
                    [
                        DASHBOARD_ITEM,
                        LOKET_ITEMS[0],
                        PRODUCTION_ITEMS[1],
                        LOKET_ITEMS[2],
                        LOKET_ITEMS[1],
                    ],
                );
            case 'qc':
            case 'penjahit':
                return new Navigation(null, [], []);
        }
    }

    get allItems(): NavItem[] {
        const top = this.topItem ? [this.topItem] : [];
        return [...top, ...this.groups.flatMap((group) => group.items)];
    }

    static isActive(item: NavItem): boolean {
        return route().current(item.activePattern) === true;
    }
}
