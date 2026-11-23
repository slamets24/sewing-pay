<?php

namespace App\Support\Activity;

use Illuminate\Support\Str;

/** Plain-language names for actions (route names), record types and fields in the activity history. */
final class ActivityCatalog
{
    /** @var array<string, string> */
    private const ACTIONS = [
        'login' => 'Masuk aplikasi',
        'logout' => 'Keluar aplikasi',
        'password.store' => 'Atur ulang password (lupa password)',

        'work-orders.store' => 'Buat WO',
        'work-orders.update' => 'Ubah WO',
        'work-orders.destroy' => 'Hapus WO',
        'work-orders.purge' => 'Hapus total WO',
        'work-orders.pull-packing' => 'Tarik WO dari Packing',
        'work-order-items.store' => 'Tambah baris artikel WO',
        'work-order-items.update' => 'Ubah qty WO',
        'work-order-items.destroy' => 'Hapus baris artikel WO',
        'work-order-items.step-back' => 'Mundurkan tahap',

        'cutting-receipts.store' => 'Kirim ke cutting',
        'cutting-receipts.batch' => 'Kirim ke cutting massal',
        'cutting-receipts.transfer-all' => 'Semua print kirim ke cutting',
        'cutting-receipts.update' => 'Ubah qty kirim cutting',
        'cutting-receipts.destroy' => 'Hapus kirim cutting',

        'hancaan-receipts.store' => 'Hancaan masuk gudang',
        'hancaan-receipts.batch' => 'Hancaan masuk gudang massal',
        'hancaan-receipts.receive-all' => 'Semua hancaan masuk gudang',
        'hancaan-receipts.update' => 'Ubah qty hancaan masuk',
        'hancaan-receipts.destroy' => 'Hapus hancaan masuk',

        'vendor-jobs.send' => 'Kirim ke vendor',
        'vendor-jobs.receive' => 'Terima dari vendor',
        'vendor-jobs.destroy' => 'Hapus kirim vendor',
        'vendor-job-returns.destroy' => 'Hapus terima vendor',

        'pickups.store' => 'Penjahit ambil barang',
        'pickup-items.cancel' => 'Batalkan ambil barang',
        'deliveries.store' => 'Setor jahitan',
        'deliveries.batch-tailor' => 'Setor semua jahitan penjahit',
        'deliveries.destroy' => 'Batalkan setoran',

        'qc-shipments.store' => 'Kirim ke QC',
        'revisions.store' => 'Catat revisi',
        'revisions.advance' => 'Lanjutkan revisi',
        'revisions.reassign' => 'Alihkan revisi',
        'revisions.destroy' => 'Hapus revisi',

        'attendances.store' => 'Isi absensi',
        'attendances.batch' => 'Tandai semua hadir',
        'attendances.destroy' => 'Hapus absensi',
        'attendances.pull-hr' => 'Tarik absensi dari HR',
        'attendances.meal-settings' => 'Ubah aturan uang makan',
        'attendances.target-day.save' => 'Atur hari target',
        'attendances.target-day.remove' => 'Hapus hari target',

        'tailors.store' => 'Tambah penjahit',
        'tailors.update' => 'Ubah data penjahit',
        'tailors.sync-hr' => 'Sinkron penjahit dari HR',

        'payouts.store' => 'Buat periode gaji',
        'payouts.regenerate' => 'Hitung ulang gaji',
        'payouts.paid' => 'Tandai semua gaji dibayar',
        'payouts.destroy' => 'Hapus periode gaji',
        'payouts.force-destroy' => 'Hapus total periode gaji',
        'payouts.submit-hr' => 'Kirim gaji ke HR',
        'payout-slips.update' => 'Ubah slip gaji',
        'payout-slips.paid' => 'Tandai slip dibayar',
        'makloon-payments.store' => 'Buat pembayaran maklun',
        'makloon-payments.destroy' => 'Hapus pembayaran maklun',

        'articles.store' => 'Tambah artikel',
        'articles.update' => 'Ubah artikel / tarif',
        'articles.sync' => 'Tarik artikel dari packingv2',
        'articles.provision-packing' => 'Minta barcode ke packing',
        'articles.samples.store' => 'Catat sample waktu',
        'articles.samples.destroy' => 'Hapus sample waktu',
        'revision-parts.store' => 'Tambah bagian revisi',
        'revision-parts.update' => 'Ubah bagian revisi',

        'users.store' => 'Buat akun',
        'users.update' => 'Ubah peran akun',
        'users.password.update' => 'Reset password akun',
        'roles.store' => 'Tambah role',
        'roles.update' => 'Ubah role & ability',
        'roles.destroy' => 'Hapus role',
        'activity-logs.purge' => 'Hapus riwayat aktivitas lama',
    ];

    /** @var array<string, string> */
    private const SUBJECTS = [
        'WorkOrder' => 'WO',
        'WorkOrderItem' => 'Artikel WO',
        'CuttingReceipt' => 'Kirim cutting',
        'HancaanReceipt' => 'Hancaan masuk',
        'VendorJob' => 'Kirim vendor',
        'VendorJobReturn' => 'Terima vendor',
        'Pickup' => 'Pengambilan',
        'PickupItem' => 'Barang diambil',
        'SewingDelivery' => 'Setoran',
        'QcShipment' => 'Kiriman QC',
        'Revision' => 'Revisi',
        'RevisionPart' => 'Bagian revisi',
        'TailorAttendance' => 'Absensi',
        'Tailor' => 'Penjahit',
        'Payout' => 'Periode gaji',
        'PayoutSlip' => 'Slip gaji',
        'MakloonPayment' => 'Pembayaran maklun',
        'Article' => 'Artikel',
        'ArticleSewingSample' => 'Sample waktu',
        'User' => 'Akun',
        'Role' => 'Role',
        'SewingSetting' => 'Pengaturan',
        'TargetDay' => 'Hari target',
    ];

    /** @var array<string, string> */
    private const FIELDS = [
        'qty' => 'Qty',
        'planned_qty' => 'Qty WO',
        'received_qty' => 'Masuk gudang',
        'cutting_qty' => 'Di cutting',
        'assigned_qty' => 'Diambil penjahit',
        'delivered_qty' => 'Sudah setor',
        'returned_qty' => 'Kembali',
        'revision_hold_qty' => 'Ditahan revisi',
        'tailor_id' => 'Penjahit',
        'article_id' => 'Artikel',
        'work_order_id' => 'WO',
        'work_order_item_id' => 'Artikel WO',
        'color' => 'Warna',
        'size' => 'Ukuran',
        'number' => 'Nomor',
        'code' => 'Kode',
        'name' => 'Nama',
        'email' => 'Email',
        'role' => 'Peran',
        'notes' => 'Catatan',
        'note' => 'Catatan',
        'status' => 'Status',
        'sewing_rate' => 'Tarif jahit',
        'makloon_sewing_rate' => 'Tarif maklun',
        'subtotal' => 'Subtotal',
        'rate' => 'Tarif',
        'is_active' => 'Aktif',
        'is_payable' => 'Dibayar',
        'transferred_at' => 'Waktu kirim cutting',
        'received_at' => 'Waktu masuk',
        'picked_at' => 'Waktu ambil',
        'delivered_at' => 'Waktu setor',
        'sent_at' => 'Waktu kirim',
        'returned_at' => 'Waktu kembali',
        'paid_at' => 'Waktu bayar',
        'cancelled_at' => 'Waktu batal',
        'ordered_at' => 'Tanggal WO',
        'due_at' => 'Deadline',
        'date' => 'Tanggal',
        'clock_in' => 'Jam masuk',
        'clock_out' => 'Jam pulang',
        'working_hours' => 'Jam kerja',
        'meal_allowance' => 'Uang makan',
        'gross_amount' => 'Kotor',
        'bonus_amount' => 'Bonus',
        'deduction_amount' => 'Potongan',
        'net_amount' => 'Bersih',
        'adjustment_amount' => 'Penyesuaian',
        'kasbon_warung_amount' => 'Kasbon warung',
        'kasbon_mingguan_amount' => 'Kasbon mingguan',
        'vendor_name' => 'Vendor',
        'process' => 'Proses',
        'channel' => 'Channel',
        'category' => 'Kategori',
        'item_type' => 'Jenis',
        'abilities' => 'Ability',
        'can_login' => 'Bisa login',
        'password' => 'Password',
    ];

    public static function action(?string $action): ?string
    {
        if ($action === null || $action === '') {
            return null;
        }

        return self::ACTIONS[$action] ?? Str::of($action)->replace(['.', '-', '_', ':'], ' ')->squish()->ucfirst()->toString();
    }

    public static function subject(?string $type): ?string
    {
        return $type === null ? null : (self::SUBJECTS[$type] ?? Str::headline($type));
    }

    public static function field(string $field): string
    {
        return self::FIELDS[$field] ?? Str::of($field)->replace('_', ' ')->ucfirst()->toString();
    }

    /** @return array<string, string> */
    public static function subjects(): array
    {
        return self::SUBJECTS;
    }
}
