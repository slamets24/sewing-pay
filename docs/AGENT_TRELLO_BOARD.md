# Agent Trello Board

This is the working board for all coding agents.

Board rule:

- Move cards from Backlog to Ready only after requirements are clear.
- Move cards to In Progress only when ownership is assigned.
- Move cards to Review when implementation or document output is ready.
- Move cards to QA when it can be tested.
- Move cards to Done only after acceptance criteria pass.


## PM And QA Gate

A card that changes product behavior cannot move to Done until:

- PM Lead confirms it matches product flow and scope.
- QA Lead confirms it passes relevant test/checklist coverage.

PM and QA are allowed to correct code or request changes from any agent output.
## Labels

- `[PM]` Product and planning
- `[BE]` Backend
- `[FE]` Frontend
- `[UX]` UI/UX
- `[QA]` Quality assurance
- `[DOC]` Documentation
- `[SETUP]` Project setup
- `[PAYROLL]` Payroll logic
- `[MOBILE]` Mobile admin
- `[DASHBOARD]` Superadmin dashboard

## Backlog

### Card: Define MVP Backlog

Labels: `[PM]`

Owner: PM Lead

Subagents:

- PM Analyst
- PM Delivery Coordinator

Description:

Convert current product flow into MVP user stories.

Acceptance criteria:

- User stories exist for Superadmin and Admin.
- MVP and non-MVP scope are separated.
- Open questions are listed.
- References `PRODUCT_FLOW.md` and `EXCEL_PAYROLL_ANALYSIS.md`.

### Card: Define Database Schema V1

Labels: `[BE]`

Owner: Backend Lead

Subagents:

- Backend Data Modeler

Description:

Design schema for users, tailors, work types, hancaan/articles, assignments, completions, payroll periods, payrolls, and payroll items.

Acceptance criteria:

- Supports partial completion.
- Supports multiple active hancaan per tailor.
- Stores rate snapshot on transaction/payroll item.
- Does not use tariff combination by color/size.
- Supports future makloon extension without building it now.

### Card: Define Backend Service Contract

Labels: `[BE]`, `[PAYROLL]`

Owner: Backend Lead

Subagents:

- Backend Business Logic Engineer

Description:

Define service/action classes for assignment, completion, payroll, invoice, and WhatsApp links.

Acceptance criteria:

- Services listed with method responsibilities.
- Payroll period rules support 1-14 and 15-end month.
- Public slip token flow defined.
- WhatsApp message fields defined.

### Card: Define Superadmin Dashboard UX

Labels: `[UX]`, `[DASHBOARD]`

Owner: UI/UX Lead

Subagents:

- UI Systems Designer

Description:

Design desktop dashboard sections for superadmin.

Acceptance criteria:

- Dashboard summary cards listed.
- Main table/filter behavior defined.
- Payroll summary section defined.
- Status badge rules defined.

### Card: Define Mobile Admin UX

Labels: `[UX]`, `[MOBILE]`

Owner: UI/UX Lead

Subagents:

- UX Workflow Reviewer

Description:

Design simple mobile-first admin flow for input hancaan, assign, and complete qty.

Acceptance criteria:

- Flow uses minimal typing.
- Admin selects existing hancaan and tailor.
- Partial completion is easy.
- Multiple active hancaan is visible.

### Card: Define Frontend Page Map

Labels: `[FE]`

Owner: Frontend Lead

Subagents:

- Frontend Page Builder
- Frontend Interaction Engineer

Description:

List Vue pages, domain components, composables, and TypeScript contracts needed for M1.

Acceptance criteria:

- Page map exists.
- Component ownership exists.
- shadcn-vue components listed.
- Data-bound pages wait for backend contract.

### Card: Define QA Test Matrix

Labels: `[QA]`

Owner: QA Lead

Subagents:

- QA Automation Engineer
- QA Product Tester

Description:

Create automated and manual test matrix for M1 and payroll later.

Acceptance criteria:

- Tests cover partial qty.
- Tests cover multiple active hancaan.
- Tests cover revision items.
- Tests cover rate snapshot.
- Tests cover public slip token in later phase.

## Ready

### Card: Setup Laravel + Vue + Inertia Project

Labels: `[SETUP]`, `[BE]`, `[FE]`

Owner: Main Coordinator

Description:

Create Laravel project using Vue/Inertia/TypeScript starter, then prepare shadcn-vue. Install location must be the current workspace root: `C:\Users\USER\Documents\coding\sweing-pay`, not a nested project folder.

Acceptance criteria:

- Laravel app boots locally.
- Vue/Inertia page renders.
- TypeScript compiles.
- shadcn-vue initialized.
- Build command passes.

### Card: Setup Project Documentation Index

Labels: `[DOC]`, `[PM]`

Owner: PM Lead

Description:

Create docs index linking product flow, Excel analysis, agent team, parallel plan, and Trello board.

Acceptance criteria:

- One docs index file exists.
- All planning docs are discoverable.

## In Progress

No cards yet.

## Review

No cards yet.

## QA

No cards yet.

## Done

### Card: Create Agent Team Structure

Labels: `[PM]`, `[DOC]`

Owner: Main Coordinator

Output:

- `.agents/WEBSITE_TEAM.md`

### Card: Analyze Excel Payroll Reference

Labels: `[PM]`, `[PAYROLL]`, `[DOC]`

Owner: Main Coordinator

Output:

- `docs/EXCEL_PAYROLL_ANALYSIS.md`

### Card: Capture Product Flow

Labels: `[PM]`, `[DOC]`

Owner: Main Coordinator

Output:

- `docs/PRODUCT_FLOW.md`

### Card: Create Parallel Agent Plan

Labels: `[PM]`, `[DOC]`

Owner: Main Coordinator

Output:

- `docs/AGENT_PARALLEL_PLAN.md`


### Card: Setup Laravel + Vue + Inertia + shadcn-vue Project

Labels: `[SETUP]`, `[BE]`, `[FE]`

Owner: Main Coordinator

Output:

- Laravel 13 installed in root folder.
- Breeze Vue + Inertia + TypeScript installed.
- shadcn-vue initialized with Laravel template.
- Core shadcn-vue components added.
- `npm run build` passed.
- `php artisan test` passed.
## M1 Sprint Goal

```text
Superadmin can see dashboard shell.
Admin can use mobile shell.
Admin can create hancaan, assign hancaan to tailor, and record partial completion.
System can show who is working on what.
```

## M1 Not Included

- Payroll close final.
- Public slip gaji.
- WhatsApp redirect.
- Makloon.
- Full Excel import UI.

## Next Move

Start with:

1. Setup Laravel + Vue + Inertia Project.
2. PM Lead moves MVP cards from Backlog to Ready.
3. Backend Lead drafts schema.
4. UI/UX Lead drafts two-view flow.
5. QA Lead drafts M1 test matrix.
## M2 Completion Log

Status: Done

Delivered:

- Payroll periods for official slots `1-14` and `15-end of month`.
- Slip generation grouped per penjahit from completion date.
- Slip line snapshot for article, color, size, work type, qty, rate, subtotal, and completed date.
- Locked payroll periods cannot regenerate and reject backdated completion.
- Public slip route `/slip-gaji/{invoice_number}/{public_token}`.
- WhatsApp URL service with `08...` to `62...` normalization.

QA:

- `php artisan test` passed with payroll coverage.
- `npm run build` passed.

## M3 Sprint Goal

```text
Admin lapangan can use a simple mobile-first page to input hancaan, assign hancaan to penjahit, record partial completion, and see active work quickly.
```

## M3 Slice 1 Completion Log

Status: Done

Delivered:

- Authenticated route `/admin-mobile` named `admin.mobile`.
- Mobile-first Vue page `AdminMobile/Index`.
- Quick summary cards for active assignments, completed qty today, available qty, and running wage estimate.
- Mobile tabs for `Hari Ini`, `Hancaan`, `Ambil`, and `Selesai`.
- Store redirects now return to the source page with dashboard fallback, so mobile forms stay on mobile.
- Navigation link added for `Admin Mobile`.

QA:

- Mobile route renders operational data in feature tests.
- Assignment submitted from mobile redirects back to `/admin-mobile`.
- `php artisan test` passed: 44 tests, 192 assertions.
- `npm run build` passed.
## M3 Slice 2 Completion Log

Status: Done

Delivered:

- Added `UserRole` enum with `superadmin` and `admin`.
- Added `role` column to users.
- Added role middleware alias `role`.
- Split route access:
  - Superadmin: dashboard, master penjahit, master tarif, payroll controls.
  - Admin and superadmin: mobile admin, hancaan input, assignment, completion.
- Login/register redirect now follows role home route.
- Registered users default to `admin`.
- Demo seed user `test@example.com` is `superadmin`.
- Inertia auth props now expose explicit user role fields.
- Navigation hides Dashboard for admin users.

QA:

- `php artisan migrate --force` applied role migration locally.
- `php artisan db:seed --force` refreshed demo user role.
- `php artisan test` passed: 47 tests, 204 assertions.
- `npm run build` passed.
## M3 Slice 3 Completion Log

Status: Done

Delivered:

- Added local-only `OperationalDemoSeeder` for Herd demo data.
- Demo data includes active tailors, ready/in-progress hancaan, active assignments, and partial completions.
- Demo seeder uses domain actions for assignment and completion so stock/status/rate snapshots stay consistent.
- `DatabaseSeeder` calls operational demo data only in local environment.
- Mobile admin quick qty controls added:
  - Assignment qty buttons: `5`, `10`, `20`, `Semua`.
  - Completion qty buttons: `1`, `5`, `10`, `Sisa`.
- Selecting an active job from `Hari Ini` moves admin to `Selesai` and pre-fills a safe qty.

QA:

- `php artisan db:seed --force` ran successfully for Herd local data.
- Added `OperationalDemoSeederTest` for idempotent demo data.
- `php artisan test` passed: 48 tests, 211 assertions.
- `npm run build` passed.
## M3 Slice 4 Completion Log

Status: Done

Delivered:

- Added superadmin user management from Dashboard > Master Data.
- Superadmin can create `admin` or `superadmin` accounts without public registration.
- Added `ManagedUserController` and `StoreManagedUserRequest`.
- Dashboard now shares recent users and available role options.
- New users created by superadmin are email-verified immediately and can log in with the assigned password.
- Admin users are forbidden from creating accounts.

QA:

- Added `ManagedUserTest` for create-user, admin forbidden, and dashboard props.
- `php artisan test` passed: 51 tests, 235 assertions.
- `npm run build` passed.
## M3 Slice 5 Completion Log

Status: Done

Delivered:

- Superadmin can update another user's role from Dashboard > Master Data > Akun Pengguna.
- Superadmin can reset another user's password from the same user card.
- Backend keeps controllers thin with dedicated Form Requests for role update and password reset.
- Self role changes are blocked so a superadmin cannot accidentally demote their own active account.
- Dashboard user payload now marks the current user and the UI disables self role editing.

QA:

- Added `ManagedUserTest` coverage for role update, password reset, admin forbidden access, and self-role guard.
- `php artisan test --filter=ManagedUserTest` passed: 7 tests, 43 assertions.
- `php artisan test` passed: 55 tests, 254 assertions.
- `npm run build` passed. Existing Rolldown warning comes from `node_modules/@vueuse/core` annotation placement.
## M3 Slice 6 Completion Log

Status: Done

Delivered:

- Added paid workflow for payroll slips from Dashboard > Gajian > Slip Terakhir.
- Added `MarkPayrollSlipPaidAction` and thin `PayrollSlipController` endpoint.
- Slip can only be marked paid after the payroll period is locked.
- When all slips in a period are paid, the payroll period status follows to `Paid`.
- Dashboard slip payload now includes status, WhatsApp URL, public URL, paid timestamp, and payment action flag.
- Dashboard slip actions now show `WA`, `Buka`, and `Dibayar` buttons on desktop and mobile layouts.

QA:

- Added payroll tests for WhatsApp payload, payment guard, slip paid status, and period paid sync.
- `php artisan test --filter=PayrollPeriodGenerationTest` passed: 11 tests, 70 assertions.
- `php artisan test` passed: 58 tests, 273 assertions.
- `npm run build` passed. Existing Rolldown warning comes from `node_modules/@vueuse/core` annotation placement.
## M3 Slice 7 Completion Log

Status: Done

Delivered:

- Added client-side search for Dashboard > Gajian > Slip Terakhir.
- Added client-side search for Dashboard > Monitoring > Sedang Dikerjakan.
- Search filters by tailor, period/status for slips, and tailor/hancaan/color/size/work/status for active assignments.
- Filtering is local to the already-loaded dashboard data, so it does not add server round trips.

QA:

- `npm run build` passed after Vue/TypeScript validation.
- Existing Rolldown warning comes from `node_modules/@vueuse/core` annotation placement.
## M3 Slice 8 Completion Log

Status: Done

Delivered:

- Added superadmin edit flow for master tailors from Dashboard > Master Data.
- Added superadmin activate/deactivate flow for tailors.
- Added superadmin edit flow for work types/tariffs.
- Added superadmin activate/deactivate flow for work types/tariffs.
- Added superadmin edit flow for ready hancaan/articles.
- Added hancaan cancel flow for unassigned hancaan.
- Hancaan planned qty cannot be reduced below already assigned qty.
- Dashboard assignment and hancaan creation selects now only use active tailors and active work types.

QA:

- Added `MasterDataManagementTest` for edit/toggle tailors, edit/toggle work types, hancaan edit, hancaan cancel, and admin forbidden access.
- `php artisan test --filter=MasterDataManagementTest` passed: 6 tests, 43 assertions.
- `php artisan test` passed: 64 tests, 316 assertions.
- `npm run build` passed. Existing Rolldown warning comes from `node_modules/@vueuse/core` annotation placement.
## M4 Sprint Goal

```text
Superadmin can harden payroll before payment, apply bonus/deduction adjustments, and export payroll reports for owner review.
```

## M4 Slice 1 Completion Log

Status: Done

Delivered:

- Added payroll slip adjustment workflow for bonus, deduction/kasbon, and notes.
- Added `UpdatePayrollSlipAdjustmentAction` and dedicated Form Request validation.
- Slip adjustment recalculates slip net amount and payroll period total amount.
- Paid slips reject further adjustment changes.
- Dashboard > Gajian > Slip Terakhir now has an `Atur` action for editable slip adjustments.

QA:

- Added payroll tests for adjustment update, paid-slip guard, and period total sync.
- `php artisan test --filter=PayrollPeriodGenerationTest` passed: 13 tests, 87 assertions.
- `php artisan test` passed: 66 tests, 333 assertions.
- `npm run build` passed. Existing Rolldown warning comes from `node_modules/@vueuse/core` annotation placement.

## M4 Slice 2 Completion Log

Status: Done

Delivered:

- Added CSV export for payroll periods through `ExportPayrollPeriodCsvAction`.
- Added superadmin route `/payroll-periods/{period}/export`.
- Export includes period, tailor, slip, line item, bonus, deduction/kasbon, net total, status, and notes fields.
- Dashboard > Gajian > Periode Terakhir now shows `Export` after a period has generated slips.
- Admin role is blocked from payroll export by existing role middleware.

QA:

- Added payroll export tests for CSV content and admin forbidden access.
- `php artisan test --filter=PayrollPeriodGenerationTest` passed: 15 tests, 97 assertions.
- `php artisan test` passed: 68 tests, 343 assertions.
- `npm run build` passed. Existing Rolldown warning comes from `node_modules/@vueuse/core` annotation placement.
