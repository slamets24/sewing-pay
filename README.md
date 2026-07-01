# Sweing Pay

Sweing Pay adalah aplikasi payroll penjahit internal untuk mencatat hancaan/artikel, memantau pekerjaan yang sedang berjalan, menghitung gaji dua mingguan, dan membagikan slip gaji melalui link publik atau WhatsApp.

Aplikasi ini dibuat untuk alur operasional konveksi/jahit internal: admin mencatat hancaan, penjahit mengambil pekerjaan, admin menginput progres selesai, lalu superadmin membuat periode gaji dan slip pembayaran.

## Fitur Utama

- Dashboard superadmin untuk ringkasan hancaan, pekerjaan berjalan, penjahit aktif, estimasi gaji, dan slip terbaru.
- Tampilan mobile admin untuk input hancaan, pengambilan hancaan, pencatatan qty selesai, dan monitoring cepat di lapangan.
- Master data penjahit, jenis pekerjaan/tarif, hancaan/artikel, dan akun pengguna.
- Alur pengambilan hancaan oleh penjahit dengan stok tersedia, qty diambil, qty selesai, dan sisa pekerjaan.
- Pencatatan penyelesaian sebagian atau cicilan untuk satu pengambilan hancaan.
- Periode gaji dua mingguan dengan generate slip, lock periode, penyesuaian bonus/potongan, dan status pembayaran.
- Slip gaji publik dengan token aman.
- Link WhatsApp untuk mengirim slip gaji ke penjahit.
- Role akses `superadmin` dan `admin`.
- Export CSV untuk periode gaji yang sudah dibuat.

## Stack Teknologi

- Laravel 13
- PHP 8.3+
- Inertia.js 2
- Vue 3
- TypeScript
- Tailwind CSS
- shadcn-vue / reka-ui
- SQLite untuk konfigurasi lokal bawaan
- PHPUnit untuk test backend
- Vite untuk asset frontend

## Kebutuhan Sistem

Pastikan sudah tersedia:

- PHP 8.3 atau lebih baru
- Composer
- Node.js dan npm
- SQLite extension untuk PHP

Opsional untuk development lokal:

- Laravel Herd, Valet, Laragon, atau server PHP bawaan Laravel

## Instalasi Lokal

Clone repository, lalu masuk ke folder proyek.

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php -r "file_exists('database/database.sqlite') || touch('database/database.sqlite');"
php artisan migrate --seed
```

Jika ingin menjalankan setup ringkas dari Composer:

```bash
composer run setup
php artisan db:seed --force
```

Catatan: `OperationalDemoSeeder` hanya otomatis dijalankan saat environment `local`.

## Menjalankan Aplikasi

Cara paling lengkap:

```bash
composer run dev
```

Perintah tersebut menjalankan server Laravel, queue listener, log viewer, dan Vite secara bersamaan.

Alternatif jika ingin menjalankan manual di terminal terpisah:

```bash
php artisan serve
npm run dev
```

URL default:

- Aplikasi: `http://127.0.0.1:8000`
- Dashboard superadmin: `http://127.0.0.1:8000/dashboard`
- Mobile admin: `http://127.0.0.1:8000/admin-mobile`

Jika memakai Laravel Herd, proyek ini juga didokumentasikan untuk:

- `http://sweing-pay.test`
- `http://sweing-pay.test/dashboard`
- `http://sweing-pay.test/admin-mobile`

## Akun Demo

Seeder bawaan membuat akun superadmin:

```text
Email: test@example.com
Password: password
Role: superadmin
```

Data demo lokal juga mencakup beberapa penjahit, hancaan, tarif pekerjaan, pengambilan hancaan, dan progres selesai sebagian.

## Alur Penggunaan Singkat

1. Login sebagai superadmin.
2. Kelola master data penjahit dan jenis pekerjaan/tarif dari dashboard.
3. Buat hancaan/artikel dengan nama artikel, warna, size, qty rencana, dan jenis pekerjaan.
4. Admin memilih hancaan, penjahit, dan qty yang diambil.
5. Admin mencatat qty selesai saat penjahit menyelesaikan pekerjaan, termasuk jika selesai bertahap.
6. Superadmin membuat periode gaji dua mingguan.
7. Generate slip gaji untuk periode tersebut.
8. Review bonus, potongan, kasbon, dan catatan slip jika diperlukan.
9. Lock periode saat data sudah final.
10. Kirim slip melalui link publik atau WhatsApp, lalu tandai slip sebagai dibayar.

## Role Akses

### Superadmin

- Mengakses dashboard utama.
- Mengelola master data penjahit, tarif, hancaan, dan akun pengguna.
- Membuat, generate, lock, export, dan memproses periode gaji.
- Melihat dan mengubah penyesuaian slip gaji.
- Menandai slip sebagai dibayar.

### Admin

- Mengakses halaman mobile admin.
- Membuat hancaan.
- Mencatat pengambilan hancaan.
- Mencatat qty selesai.
- Melihat ringkasan pekerjaan lapangan.

## Endpoint Penting

- `/dashboard` - dashboard superadmin.
- `/admin-mobile` - tampilan operasional admin mobile.
- `/profile` - profil pengguna.
- `/slip-gaji/{invoiceNumber}/{token}` - slip gaji publik.

## Perintah Development

Menjalankan development server:

```bash
composer run dev
```

Menjalankan Vite saja:

```bash
npm run dev
```

Build asset frontend:

```bash
npm run build
```

Menjalankan test:

```bash
composer test
```

Atau langsung:

```bash
php artisan test
```

Format kode PHP dengan Laravel Pint:

```bash
vendor/bin/pint
```

## Struktur Folder Penting

```text
app/Actions/                  Proses bisnis utama, seperti generate payroll dan record completion
app/Enums/                    Enum status dan role aplikasi
app/Http/Controllers/         Controller web dan modul tailor payroll
app/Http/Requests/            Validasi request
app/Models/                   Model Eloquent
app/Services/                 Service dashboard dan WhatsApp slip
database/migrations/          Struktur database
database/seeders/             Seeder akun, tarif, dan data demo
resources/js/Pages/           Halaman Inertia/Vue
resources/js/Components/      Komponen UI Vue
routes/web.php                Route utama aplikasi
tests/Feature/                Test fitur utama
docs/                         Dokumentasi produk dan rencana pengembangan
```

## Istilah Operasional

- Hancaan: barang/artikel yang siap atau sedang dikerjakan penjahit.
- Artikel: data teknis hancaan berupa nama artikel, warna, size, dan qty.
- Pengambilan hancaan: proses penjahit mengambil sejumlah qty dari hancaan tertentu.
- Completion: pencatatan qty selesai, bisa bertahap untuk satu pengambilan.
- Periode gaji: rentang dua mingguan untuk menghitung slip penjahit.
- Slip gaji: hasil perhitungan gaji per penjahit pada satu periode.

## Dokumen Tambahan

Dokumentasi lanjutan tersedia di folder `docs/`:

- `docs/PRODUCT_FLOW.md` - alur produk dan keputusan operasional.
- `docs/EXCEL_PAYROLL_ANALYSIS.md` - analisis workbook payroll lama.
- `docs/BUILD_KICKOFF.md` - catatan kickoff pembangunan.
- `docs/PM_QA_AUTHORITY.md` - catatan QA dan otoritas produk.
- `docs/AGENT_PARALLEL_PLAN.md` - rencana kerja paralel.
- `docs/AGENT_TRELLO_BOARD.md` - board kerja agen.

## Catatan Pengembangan

- Tarif awal berasal dari referensi Excel, tetapi pengelolaan tarif dilakukan dari aplikasi.
- Revisi jahitan diperlakukan sebagai jenis pekerjaan sendiri di master tarif.
- Qty selesai dapat dicatat berkali-kali untuk assignment yang sama.
- Penjahit dapat memiliki lebih dari satu hancaan aktif.
- Periode gaji yang sudah dikunci tidak seharusnya diubah lagi kecuali melalui alur yang disengaja.
