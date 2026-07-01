# Excel Payroll Analysis

Source workbook: `C:\Users\USER\Documents\Slip gaji _9.xlsx`

## Workbook Structure

- Total sheet: 49
- Sheet `Harga Jahit` adalah referensi awal untuk contoh daftar artikel/pekerjaan dan tarif.
- Sheet rekap: `Rekap Gaji` untuk pendapatan kotor, bonus/tambahan, kasbon, denda, dan pendapatan bersih.
- Sheet penjahit: satu sheet per penjahit, misalnya `ACIM`, `UUS`, `IWAN`, dan nama penjahit lain.

## Harga Jahit

- Header sheet: `No`, `Artikel`, `Jam Kerja`, `Lama Pengerjaan`, `Jumlah Hancaan`, `Salary /hari`, `Amount`, `Harga Jahit`.
- Total baris artikel/tarif terbaca: 99.
- Tarif non-zero terbaca: 73.
- `Harga Jahit` dihitung dari formula Excel: `Salary /hari / Amount`, dengan `Amount = Jam Kerja / Lama Pengerjaan * Jumlah Hancaan`.
- Untuk website, kolom `Harga Jahit` hanya menjadi referensi/import awal. Nilai tarif final tetap dikelola di master tarif website dan bisa diubah admin.

## Item Revisi / Pekerjaan Khusus

| No | Nama Pekerjaan | Harga Excel | Harga Dibulatkan |
| --- | --- | ---: | ---: |
| 82 | REVISI GANTI KERAH | 4999.66 | 5000 |
| 83 | REVISI GANTI MANSET | 4999.66 | 5000 |
| 84 | REVISI GANTI TANGAN | 6000.18 | 6000 |
| 85 | REVISI BADAN DEPAN | 10000.22 | 10000 |
| 86 | REVISI BADAN BELAKANG | 10000.22 | 10000 |
| 87 | REVISI ROK | 4999.66 | 5000 |
| 88 | REVISI GANTI LABEL | 3399.98 | 3400 |

## Pola Sheet Penjahit

- Daftar artikel di setiap sheet penjahit mengambil nama dari `Harga Jahit` kolom artikel.
- Kolom `Pengambilan Hancaan` memiliki 10 slot input qty, dari kolom D sampai M.
- `Total Pengerjaan` menjumlahkan semua slot qty: `SUM(D:M)`.
- `Total Harga` mengalikan total qty dengan master harga: `Total Pengerjaan * Harga Jahit`.
- Bagian bawah sheet punya `PENDAPATAN DARI HASIL JAHIT REGULER`, `Perhitungan Uang Makan`, `Perhitungan Jahit Sample`, `TOTAL PENDAPATAN KOTOR`, `BONUS`, `KASBON`, `DENDA`, dan `TOTAL PENDAPATAN BERSIH`.

## Implikasi Untuk Website

- Tidak perlu tarif kombinasi artikel + warna + size.
- Master tarif website dapat di-seed/import dari daftar pekerjaan/artikel di sheet `Harga Jahit`, tetapi setelah itu dikelola di website.
- Revisi seperti `REVISI GANTI TANGAN` dan `REVISI BADAN DEPAN` harus diperlakukan sebagai work type/artikel khusus yang bisa dipilih saat input pekerjaan.
- Pengambilan hancaan di website sebaiknya tidak dibatasi 10 slot seperti Excel; simpan sebagai transaksi/riwayat sebanyak apa pun.
- Qty boleh dicicil karena model Excel sendiri menjumlahkan beberapa slot pengambilan/pengerjaan.
- Rekap gaji website harus mendukung bonus/tambahan, kasbon mingguan, kasbon reguler, kasbon warung, denda/kaos bola, dan total bersih.
