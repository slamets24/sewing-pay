<?php

namespace App\Enums;

/**
 * Every permission the app checks. This list is the source of truth: routes use `can:<value>`,
 * roles store a subset of these values, and Superadmin (Owner) always holds all of them.
 *
 * Adding a feature? Add its ability here, guard the route with `can:<value>`, then run
 * `php artisan abilities:audit` — it fails while any staff route is left without an ability.
 */
enum Ability: string
{
    // Dashboard
    case DashboardView = 'dashboard.view';

    // Operasional Loket
    case DeskUse = 'desk.use';
    case PickupsManage = 'pickups.manage';
    case DeliveriesManage = 'deliveries.manage';

    // Produksi & QC
    case WorkOrdersView = 'work-orders.view';
    case WorkOrdersManage = 'work-orders.manage';
    case WorkOrdersPurge = 'work-orders.purge';
    case CuttingManage = 'cutting.manage';
    case HancaanManage = 'hancaan.manage';
    case VendorProcessManage = 'vendor-process.manage';
    case ProductionReportsView = 'production-reports.view';
    case QcShipmentsManage = 'qc-shipments.manage';
    case RevisionsManage = 'revisions.manage';

    // Kepegawaian
    case AttendancesManage = 'attendances.manage';
    case TailorsManage = 'tailors.manage';
    case TailorsSyncHr = 'tailors.sync-hr';

    // Keuangan & Gaji
    case PayoutsView = 'payouts.view';
    case PayoutsManage = 'payouts.manage';
    case PayoutsPay = 'payouts.pay';
    case PayoutsForceDelete = 'payouts.force-delete';
    case MakloonPaymentsManage = 'makloon-payments.manage';

    // Master Data
    case ArticlesView = 'articles.view';
    case ArticlesCreate = 'articles.create';
    case ArticlesUpdate = 'articles.update';
    case ArticlesSamples = 'articles.samples';
    case ArticlesSync = 'articles.sync';
    case RevisionPartsManage = 'revision-parts.manage';
    case UsersManage = 'users.manage';
    case RolesManage = 'roles.manage';
    case ActivityLogsView = 'activity-logs.view';
    case ActivityLogsPurge = 'activity-logs.purge';

    public function label(): string
    {
        return match ($this) {
            self::DashboardView => 'Lihat dashboard',
            self::DeskUse => 'Loket cepat',
            self::PickupsManage => 'Ambil barang',
            self::DeliveriesManage => 'Setor jahitan',
            self::WorkOrdersView => 'Lihat work order',
            self::WorkOrdersManage => 'Kelola work order',
            self::WorkOrdersPurge => 'Hapus total work order',
            self::CuttingManage => 'Terima cutting',
            self::HancaanManage => 'Terima hancaan',
            self::VendorProcessManage => 'Kirim & terima vendor',
            self::ProductionReportsView => 'Rekap produksi',
            self::QcShipmentsManage => 'Kirim ke QC',
            self::RevisionsManage => 'Catat revisi',
            self::AttendancesManage => 'Kehadiran penjahit',
            self::TailorsManage => 'Data penjahit & makloon',
            self::TailorsSyncHr => 'Sinkron penjahit dari HR',
            self::PayoutsView => 'Lihat gaji penjahit',
            self::PayoutsManage => 'Kelola gaji penjahit',
            self::PayoutsPay => 'Tandai gaji dibayar',
            self::PayoutsForceDelete => 'Hapus total gaji',
            self::MakloonPaymentsManage => 'Pembayaran maklun',
            self::ArticlesView => 'Lihat artikel & tarif',
            self::ArticlesCreate => 'Tambah artikel manual',
            self::ArticlesUpdate => 'Ubah artikel & tarif jahit',
            self::ArticlesSamples => 'Sample waktu jahit',
            self::ArticlesSync => 'Tarik artikel & barcode packing',
            self::RevisionPartsManage => 'Bagian revisi',
            self::UsersManage => 'Kelola akun pengguna',
            self::RolesManage => 'Kelola role & ability',
            self::ActivityLogsView => 'Riwayat aktivitas',
            self::ActivityLogsPurge => 'Hapus riwayat aktivitas',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::DashboardView => 'Halaman beranda dengan ringkasan produksi.',
            self::DeskUse => 'Layar loket untuk ambil & setor cepat.',
            self::PickupsManage => 'Catat dan batalkan barang yang diambil penjahit.',
            self::DeliveriesManage => 'Catat, setor semua, dan batalkan setoran jahitan.',
            self::WorkOrdersView => 'Buka daftar dan detail WO.',
            self::WorkOrdersManage => 'Buat, ubah, hapus WO & barisnya, tarik dari packing, mundurkan tahap.',
            self::WorkOrdersPurge => 'Hapus WO yang sudah berjalan beserta seluruh riwayatnya.',
            self::CuttingManage => 'Catat, ubah, dan hapus penerimaan cutting.',
            self::HancaanManage => 'Catat, ubah, dan hapus penerimaan hancaan.',
            self::VendorProcessManage => 'Catat hancaan keluar ke vendor proses (Bordir, Prisket, dll) dan masuk gudang lagi.',
            self::ProductionReportsView => 'Laporan & grafik hasil produksi.',
            self::QcShipmentsManage => 'Kirim barang jadi ke QC dan cetak label.',
            self::RevisionsManage => 'Catat, lanjutkan, alihkan, dan hapus revisi.',
            self::AttendancesManage => 'Isi dan hapus absensi penjahit.',
            self::TailorsManage => 'Lihat, tambah, dan ubah data penjahit & makloon.',
            self::TailorsSyncHr => 'Tarik data karyawan penjahit dari HR Azzahra.',
            self::PayoutsView => 'Buka daftar periode gaji dan slipnya.',
            self::PayoutsManage => 'Buat periode gaji, hitung ulang, ubah slip, dan hapus.',
            self::PayoutsPay => 'Tandai slip atau seluruh periode sudah dibayar.',
            self::PayoutsForceDelete => 'Hapus periode gaji yang sudah dibayar beserta slipnya.',
            self::MakloonPaymentsManage => 'Lihat, buat, dan hapus pembayaran maklun.',
            self::ArticlesView => 'Buka daftar artikel dan tarifnya.',
            self::ArticlesCreate => 'Tambah artikel yang tidak ada di packingv2.',
            self::ArticlesUpdate => 'Ubah nama, catatan, status aktif, dan tarif jahit (termasuk tarif khusus saat ambil barang).',
            self::ArticlesSamples => 'Catat dan hapus sample waktu jahit untuk patokan tarif.',
            self::ArticlesSync => 'Tarik artikel dari packingv2 dan minta barcode.',
            self::RevisionPartsManage => 'Tambah dan ubah daftar bagian revisi.',
            self::UsersManage => 'Buat akun, ubah peran, dan reset password akun lain.',
            self::RolesManage => 'Tambah role dan atur ability-nya. Khusus Owner.',
            self::ActivityLogsView => 'Lihat siapa memasukkan, mengubah, dan menghapus data di semua menu.',
            self::ActivityLogsPurge => 'Hapus riwayat lama sampai tanggal tertentu. Khusus Owner.',
        };
    }

    public function group(): string
    {
        return match ($this) {
            self::DashboardView => 'Dashboard',
            self::DeskUse, self::PickupsManage, self::DeliveriesManage => 'Operasional Loket',
            self::WorkOrdersView, self::WorkOrdersManage, self::WorkOrdersPurge, self::CuttingManage, self::HancaanManage, self::VendorProcessManage,
            self::ProductionReportsView, self::QcShipmentsManage, self::RevisionsManage => 'Produksi & QC',
            self::AttendancesManage, self::TailorsManage, self::TailorsSyncHr => 'Kepegawaian',
            self::PayoutsView, self::PayoutsManage, self::PayoutsPay, self::PayoutsForceDelete, self::MakloonPaymentsManage => 'Keuangan & Gaji',
            self::ArticlesView, self::ArticlesCreate, self::ArticlesUpdate, self::ArticlesSamples, self::ArticlesSync,
            self::RevisionPartsManage, self::UsersManage, self::RolesManage, self::ActivityLogsView, self::ActivityLogsPurge => 'Master Data',
        };
    }

    /**
     * Owner-only abilities can't be handed to another role: whoever holds them could grant themselves everything,
     * or erase the trail of what they did.
     */
    public function isOwnerOnly(): bool
    {
        return in_array($this, [self::RolesManage, self::ActivityLogsPurge], true);
    }

    /** Destructive or money-moving actions, flagged in the role editor. */
    public function isSensitive(): bool
    {
        return in_array($this, [self::WorkOrdersPurge, self::PayoutsPay, self::PayoutsForceDelete, self::MakloonPaymentsManage, self::UsersManage, self::ActivityLogsView], true);
    }

    /**
     * The ability whose page this action lives on; granting the action grants it too.
     */
    public function requires(): ?self
    {
        return match ($this) {
            self::WorkOrdersManage, self::WorkOrdersPurge, self::CuttingManage, self::HancaanManage, self::VendorProcessManage => self::WorkOrdersView,
            self::PayoutsManage, self::PayoutsPay, self::PayoutsForceDelete => self::PayoutsView,
            self::ArticlesCreate, self::ArticlesUpdate, self::ArticlesSamples, self::ArticlesSync => self::ArticlesView,
            default => null,
        };
    }

    /**
     * Cleans a submitted list: drops unknown and owner-only values, adds required abilities, keeps catalog order.
     *
     * @param  iterable<string>  $values
     * @return list<string>
     */
    public static function normalize(iterable $values): array
    {
        $picked = [];

        foreach ($values as $value) {
            $ability = self::tryFrom((string) $value);

            if ($ability === null || $ability->isOwnerOnly()) {
                continue;
            }

            $picked[$ability->value] = true;

            if ($required = $ability->requires()) {
                $picked[$required->value] = true;
            }
        }

        return array_values(array_filter(self::values(), fn (string $value) => isset($picked[$value])));
    }

    /** @return list<self> */
    public static function assignable(): array
    {
        return array_values(array_filter(self::cases(), fn (self $ability) => ! $ability->isOwnerOnly()));
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $ability) => $ability->value, self::cases());
    }

    /**
     * What the built-in Admin role could do before roles became editable — the seed for that role.
     *
     * @return list<self>
     */
    public static function adminDefaults(): array
    {
        return [
            self::DashboardView,
            self::DeskUse,
            self::PickupsManage,
            self::DeliveriesManage,
            self::WorkOrdersView,
            self::WorkOrdersManage,
            self::CuttingManage,
            self::HancaanManage,
            self::VendorProcessManage,
            self::ProductionReportsView,
            self::QcShipmentsManage,
            self::RevisionsManage,
            self::AttendancesManage,
            self::ArticlesView,
            self::ArticlesCreate,
            self::UsersManage,
        ];
    }

    /**
     * Landing page per ability, in the order a user's home page is chosen.
     *
     * @return array<string, string> ability value => route name
     */
    public static function homeRoutes(): array
    {
        return [
            self::DashboardView->value => 'dashboard',
            self::DeskUse->value => 'desk.index',
            self::WorkOrdersView->value => 'work-orders.index',
            self::PickupsManage->value => 'pickups.create',
            self::DeliveriesManage->value => 'deliveries.index',
            self::ProductionReportsView->value => 'production-reports.index',
            self::QcShipmentsManage->value => 'qc-shipments.index',
            self::RevisionsManage->value => 'revisions.index',
            self::AttendancesManage->value => 'attendances.index',
            self::TailorsManage->value => 'tailors.index',
            self::PayoutsView->value => 'payouts.index',
            self::MakloonPaymentsManage->value => 'makloon-payments.index',
            self::ArticlesView->value => 'articles.index',
            self::RevisionPartsManage->value => 'revision-parts.index',
            self::UsersManage->value => 'users.index',
            self::ActivityLogsView->value => 'activity-logs.index',
        ];
    }
}
