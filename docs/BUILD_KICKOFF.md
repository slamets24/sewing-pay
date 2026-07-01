# Build Kickoff

Dokumen ini menjelaskan urutan awal pembangunan aplikasi sebelum agents mulai coding paralel.


## Install Location Rule

Semua instalasi project wajib berada langsung di folder workspace ini:

```text
C:\Users\USER\Documents\coding\sweing-pay
```

Jangan membuat project Laravel di folder luar atau nested folder seperti `sweing-pay/sweing-pay`.

Target struktur setelah setup:

```text
sweing-pay/
  app/
  bootstrap/
  config/
  database/
  public/
  resources/
  routes/
  tests/
  composer.json
  package.json
```

Jika installer Laravel butuh folder kosong, jalankan installer dengan mode current directory atau buat project sementara lalu pindahkan isinya ke root workspace hanya jika aman. Prioritas utama: hasil akhir ada di root folder `sweing-pay`.
## Starting Point

Kita mulai dari fondasi stack, bukan langsung fitur.

Stack:

- Laravel
- Inertia.js
- Vue 3
- TypeScript
- shadcn-vue
- Tailwind CSS
- MySQL
- PWA later phase

## Urutan Awal Yang Benar

### 1. Setup Project Laravel

Tujuan:

- Membuat project Laravel bersih.
- Mengaktifkan auth.
- Menggunakan starter Vue + Inertia + TypeScript.
- Menyiapkan Tailwind dan shadcn-vue.

Output:

- Laravel project berjalan lokal.
- Login/register atau minimal login admin siap.
- Vue + Inertia page render.
- shadcn-vue component system siap.

### 2. Setup Dev Standards

Tujuan:

- Menetapkan standar coding sebelum fitur dibuat.

Output:

- Struktur OOP Laravel:
  - `app/Actions`
  - `app/Enums`
  - `app/Services`
  - `app/Http/Requests`
  - `app/Policies`
- Struktur Vue:
  - `resources/js/Components`
  - `resources/js/Pages`
  - `resources/js/Composables`
  - `resources/js/Types`
  - `resources/js/Utils`
- Format route dan naming convention.
- Baseline test command.

### 3. Setup Roles

Role MVP:

- Superadmin
- Admin

Superadmin:

- desktop dashboard
- semua data
- payroll close
- reports

Admin:

- mobile-first
- input hancaan
- assign hancaan ke penjahit
- update qty selesai/revisi

### 4. Build Core Database

Core tables:

- users
- tailors
- work_types
- production_articles
- tailor_assignments
- tailor_assignment_completions
- payroll_periods
- payrolls
- payroll_items

Important rule:

- Tariff from Excel is reference/import seed only.
- Master tariff in website is editable.
- Each transaction stores its own rate snapshot.

### 5. Build Superadmin Shell

Desktop dashboard shell:

- sidebar
- topbar
- summary cards
- tables
- filters

### 6. Build Mobile Admin Shell

Mobile-first shell:

- Today
- Input Hancaan
- Ambil Hancaan
- Sedang Dikerjakan
- Selesai
- Gaji Berjalan

### 7. Build Feature Vertical Slice

First working slice:

1. Create tailor.
2. Create work type/tariff.
3. Create hancaan/article.
4. Assign hancaan to tailor.
5. Complete partial qty.
6. Show dashboard currently working.
7. Calculate running wage estimate.

This slice proves the app flow before payroll close is built.

### 8. Build Payroll

Payroll phase:

- generate 1-14 period
- generate 15-end period
- close period
- calculate gross pay
- apply bonus/kasbon/denda
- create slip
- public token link
- WhatsApp redirect link

### 9. QA And Hardening

Must verify:

- partial completion
- multiple active hancaan per tailor
- revision items
- rate snapshot
- payroll period boundaries
- public slip security
- WhatsApp link encoding

## Recommended Agent Start Order

1. PM Lead finalizes cards and acceptance criteria.
2. Backend Lead creates schema and service contract.
3. UI/UX Lead finalizes two-view flow.
4. Frontend Lead prepares shell after UI direction.
5. QA Lead creates tests in parallel.

## First Coding Milestone

Milestone name:

```text
M1 - Project Foundation And First Production Flow
```

Milestone goal:

Admin can create hancaan, assign it to a tailor, record partial completion, and superadmin can see who is working on what.

Excluded from M1:

- final payroll close
- public slip
- WhatsApp redirect
- makloon/external tailor
- import Excel UI

These come after the first flow works.

