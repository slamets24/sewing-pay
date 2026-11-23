import type { Ability } from '@/lib/abilities';
import {
    BarChart3,
    CalendarCheck,
    ClipboardList,
    HandPlatter,
    History,
    KeyRound,
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
    /** Label pendek untuk menu bawah di HP (ruangnya sempit). */
    shortLabel?: string;
    /** Ability needed to open the page (same one routes/web.php checks). */
    ability: Ability;
};

export type NavGroup = { label: string; items: NavItem[] };

const item = (label: string, routeName: string, icon: LucideIcon, ability: Ability, activePattern?: string, shortLabel?: string): NavItem => ({
    label,
    routeName,
    icon,
    ability,
    activePattern: activePattern ?? routeName,
    shortLabel,
});

export const DASHBOARD_ITEM = item('Dashboard', 'dashboard', LayoutDashboard, 'dashboard.view', undefined, 'Beranda');

// 1. Operasional Meja / Loket
const LOKET_ITEMS: NavItem[] = [
    item('Loket Cepat', 'desk.index', Zap, 'desk.use', 'desk.*', 'Loket'),
    item('Ambil Barang', 'pickups.create', HandPlatter, 'pickups.manage', 'pickups.*', 'Ambil'),
    item('Setor Jahitan', 'deliveries.index', PackageCheck, 'deliveries.manage', 'deliveries.*', 'Setor'),
];

// 2. Produksi & Kontrol Kualitas
const PRODUCTION_ITEMS: NavItem[] = [
    item('Work Order (WO)', 'work-orders.index', ClipboardList, 'work-orders.view', 'work-orders.*', 'WO'),
    item('Rekap Produksi', 'production-reports.index', BarChart3, 'production-reports.view', 'production-reports.*', 'Rekap'),
    item('Kirim ke QC', 'qc-shipments.index', Truck, 'qc-shipments.manage', 'qc-shipments.*'),
    item('Catat Revisi', 'revisions.index', Wrench, 'revisions.manage', 'revisions.*'),
];

// 3. Kepegawaian & Penjahit
const TAILOR_ITEMS: NavItem[] = [
    item('Kehadiran', 'attendances.index', CalendarCheck, 'attendances.manage', 'attendances.*'),
    item('Penjahit & Makloon', 'tailors.index', Users, 'tailors.manage', 'tailors.*'),
];

// 4. Keuangan & Gaji
const PAYROLL_ITEMS: NavItem[] = [
    item('Gaji Penjahit', 'payouts.index', Wallet, 'payouts.view', 'payouts.*'),
    item('Pembayaran Maklun', 'makloon-payments.index', Receipt, 'makloon-payments.manage', 'makloon-payments.*'),
];

// 5. Master Data & Pengaturan
const MASTER_ITEMS: NavItem[] = [
    item('Artikel & Tarif', 'articles.index', Shirt, 'articles.view', 'articles.*'),
    item('Bagian Revisi', 'revision-parts.index', Scissors, 'revision-parts.manage', 'revision-parts.*'),
    item('Pengguna Sistem', 'users.index', UserCog, 'users.manage', 'users.*'),
    item('Role & Akses', 'roles.index', KeyRound, 'roles.manage', 'roles.*'),
    item('Riwayat Aktivitas', 'activity-logs.index', History, 'activity-logs.view', 'activity-logs.*'),
];

const GROUPS: NavGroup[] = [
    { label: 'Operasional Loket', items: LOKET_ITEMS },
    { label: 'Produksi & QC', items: PRODUCTION_ITEMS },
    { label: 'Kepegawaian', items: TAILOR_ITEMS },
    { label: 'Keuangan & Gaji', items: PAYROLL_ITEMS },
    { label: 'Master Data', items: MASTER_ITEMS },
];

/** Preferred order for the phone bottom bar; the first five the user may open are shown. */
const BOTTOM_BAR_PREFERENCE: NavItem[] = [DASHBOARD_ITEM, LOKET_ITEMS[0], PRODUCTION_ITEMS[1], LOKET_ITEMS[2], LOKET_ITEMS[1], PRODUCTION_ITEMS[0]];
const BOTTOM_BAR_SIZE = 5;

/** The menu a user sees: every page their role's abilities allow, grouped by operational context. */
export class Navigation {
    private constructor(
        readonly topItem: NavItem | null,
        readonly groups: NavGroup[],
        readonly bottomBar: NavItem[],
    ) {}

    static forAbilities(abilities: readonly Ability[]): Navigation {
        const allowed = (navItem: NavItem) => abilities.includes(navItem.ability);

        const groups = GROUPS.map((group) => ({ ...group, items: group.items.filter(allowed) })).filter((group) => group.items.length > 0);
        const bottomBar = BOTTOM_BAR_PREFERENCE.filter(allowed).slice(0, BOTTOM_BAR_SIZE);

        return new Navigation(allowed(DASHBOARD_ITEM) ? DASHBOARD_ITEM : null, groups, bottomBar.length > 1 ? bottomBar : []);
    }

    get allItems(): NavItem[] {
        const top = this.topItem ? [this.topItem] : [];
        return [...top, ...this.groups.flatMap((group) => group.items)];
    }

    static isActive(item: NavItem): boolean {
        return route().current(item.activePattern) === true;
    }
}
