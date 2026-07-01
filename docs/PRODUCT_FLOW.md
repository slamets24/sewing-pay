# Product Flow - Aplikasi Gaji Penjahit

Dokumen ini menangkap alur aplikasi berdasarkan workflow operasional saat ini.

## Tujuan Utama

Membangun aplikasi untuk mencatat hancaan/artikel yang dikerjakan penjahit internal, memantau siapa sedang mengerjakan apa, lalu menghitung gaji penjahit setiap 2 minggu sekali.

Fokus MVP:

- Penjahit internal
- Pencatatan hancaan/artikel
- Pengambilan hancaan oleh penjahit
- Monitoring pekerjaan berjalan
- Perhitungan gaji 2 mingguan
- Slip gaji dan link WhatsApp

Ditunda:

- Penjahit eksternal / makloon
- Workflow produksi eksternal
- Perhitungan tagihan makloon

## Istilah Operasional

### Hancaan / Artikel

Hancaan adalah istilah operasional untuk barang yang sedang atau akan dikerjakan penjahit. Secara data, hancaan sebenarnya adalah kombinasi dari nama artikel, warna, dan size.

Dalam aplikasi, istilah yang bisa dipakai:

- Label UI utama: `Hancaan`
- Nama teknis/database: `articles` atau `production_articles`

Data hancaan minimal:

- nama artikel
- warna
- size
- total qty rencana
- qty tersedia untuk diambil
- status
- tanggal dibuat
- catatan

Catatan penting:

- Hancaan dipakai sebagai istilah UI agar sesuai bahasa lapangan.
- Data inti hancaan tetap disimpan sebagai artikel + warna + size + qty.
- Hancaan bukan aturan tarif baru dan bukan kombinasi harga.
- Detail harga/tarif mengikuti data harga dari file Excel slip gaji.

### Penjahit Internal

Penjahit yang mengambil dan mengerjakan hancaan dari stok/rencana internal.

Data minimal:

- nama penjahit
- kode penjahit
- nomor WhatsApp
- status aktif/nonaktif

### Penjahit Eksternal / Makloon

Pihak luar yang mengerjakan jahitan. Masuk fase lanjutan, bukan fokus MVP.

## Tampilan Aplikasi

Ada 2 tampilan utama.

## 1. Dashboard Superadmin

Target pengguna:

- owner
- superadmin
- pihak yang perlu melihat keseluruhan data

Karakter UI:

- desktop-first
- informatif
- padat tapi rapi
- banyak ringkasan dan tabel

Fitur utama:

- ringkasan total hancaan
- ringkasan pekerjaan berjalan
- penjahit aktif hari ini
- estimasi gaji berjalan
- daftar penjahit sedang mengerjakan apa
- pekerjaan selesai hari ini
- pekerjaan belum selesai
- periode gaji berjalan
- tombol tutup periode gaji
- akses semua master data
- akses laporan/slip gaji

Menu superadmin:

- Dashboard
- Hancaan / Artikel
- Penjahit
- Jenis Pekerjaan / Tarif
- Pengambilan Hancaan
- Progress Jahitan
- Gaji 2 Mingguan
- Slip Gaji
- Pengaturan

## 2. Tampilan Mobile Admin

Target pengguna:

- admin lapangan
- mandor
- orang yang input hancaan dan mencatat pengambilan penjahit

Karakter UI:

- mobile-first
- simpel
- cepat dipakai
- tombol besar
- informasi penting langsung terlihat
- minim tabel lebar

Fitur utama:

- input hancaan/artikel
- pilih artikel yang sudah disiapkan
- input qty yang diambil
- pilih nama penjahit
- lihat penjahit sedang mengerjakan apa
- update status pekerjaan
- lihat ringkasan hari ini

Menu mobile admin:

- Hari Ini
- Input Hancaan
- Ambil Hancaan
- Sedang Dikerjakan
- Selesai
- Gaji Berjalan

## Alur Utama Aplikasi

### 1. Admin Membuat Hancaan / Artikel

Admin memasukkan data produk yang siap atau direncanakan untuk dijahit.

Input:

- nama artikel
- warna
- size
- qty rencana
- jenis pekerjaan/tarif dari detail harga
- catatan opsional

Contoh:

```text
Artikel: Kemeja Linen
Warna: Navy
Size: L
Qty: 120 pcs
Status: Siap Diambil
```

Output sistem:

- hancaan masuk daftar siap diambil
- stok qty hancaan tersedia
- artikel bisa dipilih saat penjahit mengambil pekerjaan

### 2. Penjahit Mengambil Hancaan

Karena artikel, warna, dan size sudah disiapkan di awal, admin cukup memilih data yang sudah ada.

Input saat pengambilan:

- pilih hancaan/artikel
- pilih nama penjahit
- isi qty yang diambil
- tanggal ambil
- catatan opsional

Data yang otomatis terbawa:

- nama artikel
- warna
- size
- tarif pekerjaan

Contoh:

```text
Penjahit: Ibu Siti
Artikel: Kemeja Linen
Warna: Navy
Size: L
Qty diambil: 30 pcs
Status: Sedang Dikerjakan
```

Output sistem:

- stok/qty tersedia hancaan berkurang
- pekerjaan penjahit tercatat
- dashboard menampilkan Ibu Siti sedang mengerjakan Kemeja Linen Navy size L sebanyak 30 pcs

### 3. Monitoring Pekerjaan Berjalan

Superadmin dan admin bisa melihat siapa sedang mengerjakan apa.

Informasi yang ditampilkan:

- nama penjahit
- artikel
- warna
- size
- qty diambil
- qty selesai
- qty sisa
- status
- tanggal ambil
- durasi berjalan

Status awal:

```text
draft
siap_diambil
sedang_dikerjakan
selesai_sebagian
selesai
revisi
dibatalkan
```

### 4. Penjahit Menyelesaikan Pekerjaan

Admin mencatat qty yang selesai.

Input:

- pekerjaan/pengambilan hancaan
- qty selesai
- tanggal selesai
- catatan revisi jika ada

Output sistem:

- qty selesai bertambah
- estimasi upah bertambah
- data masuk perhitungan gaji periode berjalan

Qty selesai boleh dicicil beberapa kali untuk pengambilan yang sama. Ini penting karena dalam praktik bisa terjadi:

- pekerjaan urgent sehingga sebagian diselesaikan dulu
- ada barang cacat
- barang menunggu revisi
- penjahit mengambil hancaan lain sambil menunggu revisi

Contoh:

```text
Ibu Siti mengambil 30 pcs Kemeja Linen Navy L.
Hari pertama selesai 12 pcs.
Sisa 18 pcs masih berjalan.
Ada 3 pcs cacat/revisi.
Ibu Siti boleh mengambil hancaan lain sambil menunggu revisi.
```

Karena itu sistem harus menyimpan riwayat penyelesaian, bukan hanya satu angka selesai terakhir.

### 5. Gaji 2 Mingguan

Periode gaji:

```text
1-14
15-akhir bulan
```

Sumber perhitungan:

- pekerjaan yang statusnya selesai
- tanggal selesai masuk periode gaji
- qty selesai
- tarif dari detail harga

Tarif tidak menggunakan kombinasi artikel + warna + size. Daftar harga dari file Excel slip gaji dipakai sebagai referensi awal/import seed, lalu master tarif dikelola di website.

Rumus dasar:

```text
subtotal = qty selesai x tarif
total gaji = total subtotal + bonus - potongan
```

### 6. Slip Gaji dan WhatsApp

Setelah periode ditutup, sistem membuat slip gaji per penjahit.

Slip berisi:

- nama penjahit
- periode gaji
- daftar artikel yang dikerjakan
- warna
- size
- qty selesai
- tarif
- subtotal
- bonus
- potongan
- total diterima
- status pembayaran

Setiap slip punya public link aman:

```text
/slip-gaji/{invoice_number}/{public_token}
```

Tombol kirim WhatsApp membuka:

```text
https://wa.me/{nomor_penjahit}?text={pesan_slip}
```

## Modul Database Awal

Tabel inti:

```text
users
tailors
work_types
production_articles
tailor_assignments
tailor_assignment_completions
payroll_periods
payrolls
payroll_items
```

## Catatan Desain OOP

Backend Laravel:

- controller tipis
- form request untuk validasi
- action untuk proses spesifik
- service untuk perhitungan gaji
- enum untuk status
- policy untuk izin akses

Service penting:

```text
ArticleAvailabilityService
TailorAssignmentService
TailorCompletionService
PayrollPeriodService
PayrollCalculationService
PayrollInvoiceService
WhatsAppLinkService
```

## Role Aplikasi

MVP:

- Superadmin
- Admin

Superadmin:

- akses semua dashboard dan data
- kelola master data
- tutup periode gaji
- lihat semua slip dan laporan

Admin:

- mobile-first
- input hancaan
- input pengambilan hancaan
- update qty selesai
- lihat pekerjaan berjalan
- tidak perlu akses penuh ke pengaturan sistem

## Prinsip UI

Superadmin:

- dashboard desktop
- ringkasan metrik
- tabel lengkap
- filter periode, penjahit, artikel, status

Admin mobile:

- tindakan cepat
- input sedikit mungkin
- pilih dari data yang sudah disiapkan
- tombol jelas
- status pekerjaan mudah dibaca
- cocok dipakai sambil jalan di area produksi

## Open Questions

- Apakah admin boleh mengubah qty hancaan setelah sebagian sudah diambil?
- Apakah penjahit bisa melihat slip sendiri tanpa login, atau hanya dari link WhatsApp?
- Untuk makloon nanti, apakah alurnya sama seperti penjahit internal atau pakai invoice/tagihan terpisah?

## Decisions Locked

- Hancaan adalah istilah barang yang sedang dikerjakan; datanya adalah artikel + warna + size.
- Tarif mengacu referensi awal detail harga dari Excel, tidak memakai kombinasi artikel + warna + size.
- Qty selesai boleh dicicil berkali-kali untuk satu pengambilan hancaan.
- Sistem harus mendukung status revisi/cacat dan sisa pekerjaan berjalan.
- Penjahit boleh memiliki lebih dari satu hancaan aktif, karena bisa ada pekerjaan yang menunggu revisi atau urgent.





## Excel Payroll Findings Applied

Hasil analisis workbook `Slip gaji _9.xlsx`:

- Workbook berisi 49 sheet.
- Sheet `Harga Jahit` adalah master artikel dan tarif.
- Sheet `Rekap Gaji` mengambil total pendapatan dari masing-masing sheet penjahit.
- Setiap sheet penjahit memiliki daftar artikel dari `Harga Jahit`, kolom pengambilan hancaan, total pengerjaan, dan total harga.
- Tarif dari Excel dipakai sebagai referensi awal/import seed, bukan sumber kebenaran permanen.
- Item revisi/pekerjaan khusus dari Excel:
  - REVISI GANTI KERAH: 5000
  - REVISI GANTI MANSET: 5000
  - REVISI GANTI TANGAN: 6000
  - REVISI BADAN DEPAN: 10000
  - REVISI BADAN BELAKANG: 10000
  - REVISI ROK: 5000
  - REVISI GANTI LABEL: 3400

Implikasi:

- Revisi adalah pilihan pekerjaan sendiri di master tarif, bukan kombinasi tarif artikel + warna + size.
- Pengambilan/pengerjaan tidak dibatasi 10 slot seperti Excel; di website disimpan sebagai riwayat transaksi.
- Rekap gaji perlu mendukung pendapatan kotor, bonus/tambahan, kasbon mingguan, kasbon reguler, kasbon warung, denda/kaos bola, dan pendapatan bersih.

