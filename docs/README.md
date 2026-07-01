# Sewing Pay Docs

Project planning documents:

- [Product Flow](PRODUCT_FLOW.md)
- [Excel Payroll Analysis](EXCEL_PAYROLL_ANALYSIS.md)
- [Agent Parallel Plan](AGENT_PARALLEL_PLAN.md)
- [Agent Trello Board](AGENT_TRELLO_BOARD.md)
- [Build Kickoff](BUILD_KICKOFF.md)
- [PM And QA Authority](PM_QA_AUTHORITY.md)
- [Website Team](../.agents/WEBSITE_TEAM.md)

Local development:

- Primary Herd URL: `http://sweing-pay.test`
- Superadmin dashboard: `http://sweing-pay.test/dashboard`
- Mobile admin: `http://sweing-pay.test/admin-mobile`

Current build status:

1. Laravel + Vue 3 + Inertia + TypeScript + shadcn-vue is installed in the workspace root.
2. M1 production flow is implemented: hancaan, assignment, partial completion, and monitoring.
3. M2 payroll is implemented: 2-week periods, slip generation, lock protection, public slip, and WhatsApp URL service.
4. M3 started: mobile admin page for fast hancaan, assignment, completion, and monitoring.
5. Role access is active: `superadmin` for dashboard/master/payroll, `admin` for mobile operations.
6. Local Herd demo data is available from `OperationalDemoSeeder`; run `php artisan db:seed --force` to refresh it.
7. Superadmin can create users, update roles, and reset passwords from Dashboard > Master Data > Akun Pengguna.
8. Payroll slip actions are available from Dashboard > Gajian: WhatsApp slip links, public slip opening, and mark-as-paid workflow.
9. Dashboard search is available for latest payroll slips and active assignment monitoring.
10. Master data can be edited from Dashboard > Master Data: tailors, work types/tariffs, and ready hancaan, with active/nonactive controls where available.
11. M4 payroll hardening started: superadmin can update slip bonus, deduction/kasbon, and notes before payment.
12. M4 reporting started: superadmin can export generated payroll periods as CSV from Dashboard > Gajian.


