# Agent Parallel Plan

Dokumen ini menjelaskan step paralel untuk 5 lead dan 10 subagent dalam pembangunan aplikasi gaji penjahit.

Tujuan:

- Membagi kerja tanpa saling tabrak.
- Menjaga semua agent memakai product flow yang sama.
- Membuat output tiap agent bisa langsung digabung oleh main coordinator.

Referensi wajib:

- `docs/PRODUCT_FLOW.md`
- `docs/EXCEL_PAYROLL_ANALYSIS.md`
- `.agents/WEBSITE_TEAM.md`

## Prinsip Koordinasi

- Main Codex thread adalah coordinator dan final integrator.
- PM Lead menjaga scope dan acceptance criteria.
- Backend, Frontend, UI/UX, dan QA boleh jalan paralel jika output/file ownership tidak bentrok.
- Semua agent wajib membaca dokumen referensi sebelum bekerja.
- Semua agent wajib menyebut asumsi dan open question.
- Agent coding tidak boleh mengubah area agent lain tanpa koordinasi.

## Workstream Overview

| Workstream | Lead | Bisa Paralel? | Output Utama |
| --- | --- | --- | --- |
| Product Scope | PM Lead | Ya, mulai pertama | MVP backlog, acceptance criteria |
| Data & Backend | Backend Lead | Ya, setelah PM draft awal | schema, services, API/Inertia props |
| UI/UX | UI/UX Lead | Ya, setelah PM draft awal | page map, mobile flow, dashboard layout |
| Frontend | Frontend Lead | Parsial | Vue pages/components setelah UI/Backend contract |
| QA | QA Lead | Parsial | test plan sejak awal, testing setelah fitur ada |

## Phase 0 - Alignment

Jalan berurutan, bukan paralel.

Owner: PM Lead

Output:

- Ringkasan scope MVP.
- Definisi role: Superadmin dan Admin.
- Definisi istilah: Hancaan, Artikel, Penjahit, Tarif, Revisi.
- Keputusan produk yang sudah locked.
- Open questions yang masih perlu user jawab.

Done criteria:

- Semua lead memakai definisi yang sama.
- Excel dipahami sebagai referensi awal, bukan dasar final.

## Phase 1 - Discovery Paralel

Setelah Phase 0 selesai, 5 lead bisa mulai paralel.

### PM Lead

Subagent paralel:

- PM Analyst
- PM Delivery Coordinator

Tasks:

- PM Analyst memetakan Excel ke modul website.
- PM Delivery Coordinator membuat milestone dan dependency.

Output:

- MVP backlog.
- User stories.
- Acceptance criteria.
- Release phases.

### Backend Lead

Subagent paralel:

- Backend Data Modeler
- Backend Business Logic Engineer

Tasks:

- Data Modeler membuat draft ERD/tabel.
- Business Logic Engineer mendesain service payroll, assignment, completion, dan WhatsApp link.

Output:

- Draft schema.
- Model relationship.
- Service list.
- Enum/status list.
- Payroll calculation rules.

### UI/UX Lead

Subagent paralel:

- UI Systems Designer
- UX Workflow Reviewer

Tasks:

- UI Systems Designer membuat page map dan layout system.
- UX Workflow Reviewer memvalidasi flow mobile admin dan dashboard superadmin.

Output:

- Navigation map.
- Mobile admin flow.
- Superadmin dashboard sections.
- Status badge rules.
- Empty/loading/error states.

### Frontend Lead

Subagent paralel:

- Frontend Page Builder
- Frontend Interaction Engineer

Tasks:

- Page Builder membuat daftar pages dan component ownership.
- Interaction Engineer membuat daftar composables, filters, forms, and polling needs.

Output:

- Frontend page inventory.
- Component inventory.
- TypeScript data contracts draft.
- Interaction checklist.

### QA Lead

Subagent paralel:

- QA Automation Engineer
- QA Product Tester

Tasks:

- QA Automation Engineer membuat test matrix backend.
- QA Product Tester membuat manual QA checklist untuk mobile/admin/dashboard.

Output:

- Test scenarios.
- Payroll edge cases.
- Permission/security checklist.
- Browser/mobile QA checklist.

## Phase 2 - Contract Freeze

Jalan semi-berurutan.

Coordinator menggabungkan hasil Phase 1 menjadi kontrak awal.

Output kontrak:

- Database schema v1.
- Route/page map v1.
- Inertia props contract v1.
- Role permission matrix v1.
- Payroll rules v1.
- UI page priorities v1.

Done criteria:

- Backend dan Frontend sepakat nama field utama.
- UI/UX dan Frontend sepakat layout utama.
- QA punya acceptance criteria yang bisa dites.

## Phase 3 - Implementation Paralel

Implementation boleh paralel dengan ownership jelas.

### Backend Track

Owner:

- Backend Lead
- Backend Data Modeler
- Backend Business Logic Engineer

Write scope:

- `app/Models`
- `app/Enums`
- `app/Http/Requests`
- `app/Http/Controllers`
- `app/Services`
- `app/Actions`
- `database/migrations`
- `database/seeders`
- `tests/Feature` untuk backend behavior

Tasks:

- Auth and roles.
- Tailor master.
- Work type/tariff master.
- Hancaan/article master.
- Tailor assignment.
- Completion history.
- Payroll period.
- Payroll calculation.
- Public payroll slip token.
- WhatsApp URL generation.

### UI/UX Track

Owner:

- UI/UX Lead
- UI Systems Designer
- UX Workflow Reviewer

Write scope:

- Design docs.
- UI acceptance notes.
- Component usage guide.

Tasks:

- Superadmin dashboard wireframe.
- Mobile admin flow wireframe.
- Form layout rules.
- Status label/color rules.
- Slip gaji public page layout.

### Frontend Track

Owner:

- Frontend Lead
- Frontend Page Builder
- Frontend Interaction Engineer

Write scope:

- `resources/js/Pages`
- `resources/js/Components`
- `resources/js/Composables`
- `resources/js/Types`
- `resources/js/Utils`

Tasks:

- App layout.
- Superadmin dashboard.
- Mobile admin pages.
- Hancaan CRUD UI.
- Assignment form.
- Completion form.
- Payroll list/detail.
- Public slip page.

Dependency:

- Frontend can start layout and static shell early.
- Data-bound pages start after Backend exposes Inertia props/contracts.

### QA Track

Owner:

- QA Lead
- QA Automation Engineer
- QA Product Tester

Write scope:

- `tests/Feature`
- QA docs/checklists

Tasks:

- Write backend feature tests.
- Test payroll calculations.
- Test public slip token security.
- Test WhatsApp link generation.
- Test mobile admin core flows.
- Test superadmin dashboard summary.

Dependency:

- Test planning starts immediately.
- Automated tests start once backend routes/services exist.
- Browser QA starts once frontend pages render.

## Phase 4 - Integration

Coordinator merges and resolves cross-workstream issues.

Checklist:

- Backend routes match frontend forms.
- Inertia props match TypeScript types.
- Payroll numbers match expected examples.
- Public slip does not expose guessed IDs.
- WhatsApp link encodes message correctly.
- Mobile admin flow is fast enough for production floor.
- Superadmin dashboard has useful summary and filters.

## Phase 5 - QA And Hardening

QA Lead owns final verification with support from all leads.

Must test:

- Create hancaan.
- Assign hancaan to penjahit.
- Complete partial qty.
- Add revision work.
- Penjahit has multiple active hancaan.
- Close 1-14 payroll period.
- Close 15-end payroll period.
- Generate slip.
- Open public slip with valid token.
- Reject public slip with invalid token.
- Generate WhatsApp redirect.
- Bonus and kasbon affect net pay.

## Agent Activation Matrix

| Step | Agents Running In Parallel | Main Coordinator Action |
| --- | --- | --- |
| 0 | PM Lead only | Confirm scope and decisions |
| 1 | PM, Backend, UI/UX, Frontend, QA leads | Collect discovery outputs |
| 2 | PM + Backend + UI/UX | Freeze schema/page/flow contracts |
| 3 | Backend + UI/UX + Frontend + QA | Implement separated write scopes |
| 4 | Frontend + Backend + QA | Integrate and fix contract mismatches |
| 5 | QA + all leads on demand | Final verification and polish |

## Lead Handoff Template

Each lead must respond with:

```text
Lead:
Subagents used:
Scope completed:
Files changed:
Contracts/decisions:
Risks:
Open questions:
Next recommended task:
```

## Current Priority

Recommended next parallel kickoff:

1. PM Lead: finalize MVP backlog and acceptance criteria.
2. Backend Lead: propose database schema from `PRODUCT_FLOW.md` and `EXCEL_PAYROLL_ANALYSIS.md`.
3. UI/UX Lead: propose two-view UX, superadmin desktop and admin mobile.
4. QA Lead: propose payroll and token-security test matrix.

Frontend Lead should start after Backend and UI/UX produce the first contracts, except for app shell planning.
