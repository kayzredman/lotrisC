# Lotris — Sprint Tracker

> Maintained by the QA Agent after every sprint. Updated after each phase gate.
> Last updated: May 2026 — Sprint 20 IN PROGRESS (`feature/sprint-20-onboarding`). Onboarding Wizard.

---

## Current Status

| Sprint | Title                        | Status        | Branch               | Gate  |
| ------ | ---------------------------- | ------------- | -------------------- | ----- |
| 1–2    | Foundation & Auth            | ✅ Complete    | `feature/sprint-1-2-auth` | M1 |
| 3–4    | Ticket Core                  | ✅ Complete    | `feature/sprint-3-4-tickets` | M2 |
| 5–6    | Queue Engine                 | ✅ Complete    | `feature/sprint-5-6-queue` | M3  |
| 7      | Task Management              | ✅ Complete    | `feature/sprint-7-tasks` | M4    |
| 8–10   | KPI Engine                   | ✅ Complete    | `feature/sprint-8-10-kpi` | M5  |
| 11–12  | Reporting & Full Dashboard   | ✅ COMPLETE   | `dev` @ `f900bfc`                | M6 |
| 13     | System Health Monitoring     | ✅ Complete   | `dev` @ `b901271`               | M7    |
| 14–15  | UI Polish + Dashboard QA + Tickets Repair | ✅ COMPLETE | `feature/sprint-14-layout-polish` | M8 |
| 16     | QA Fixes · Monitor Wall · Role Visibility · KPI My Agreement | ✅ COMPLETE | `dev` @ `3e2b17e`    | M9 |
| 17     | Ticket Intake — Web Form + Email + Category Routing | ✅ COMPLETE | `dev` @ `af06b9c` | M10 |
| 18     | Phase 2 — SLA Breach Prediction + KPI Trend Analysis | ✅ Complete    | `dev` @ `4d640a9` | M11 |
| 19     | Phase 2 — Automated Reports + Workload Rebalancing   | ✅ COMPLETE    | `dev` @ `ca32cff`, tag `v0.19.0` | M12 |
| 20     | Onboarding Wizard                                    | 🔵 IN PROGRESS | `feature/sprint-20-onboarding`   | M13 |

---

## Sprint 17 · Ticket Intake

**Target milestone:** M10  
**Status:** ✅ COMPLETE — backend + frontend committed  
**Branch:** `feature/sprint-17-ticket-intake`

### Goal
Allow non-IT staff and external requesters to submit tickets without a Lotris account via:
1. A public web form at `/request` (SELF_SERVICE source)
2. An IMAP email inbox monitored every 60s (EMAIL source)

Tickets are automatically routed to teams via `CategoryRouting` config. ACK and resolution emails sent to requesters (no specific time promises — "shortly/soon" wording).

### Design Decisions
- Reopened tickets = new ticket with `related_ticket_id` reference (not status reopen)
- ACK/resolved emails use "shortly/soon" language — no SLA time commitments
- `INTAKE_SYSTEM_USER_ID` env var: admin sets this to a valid User UUID in their tenant — required for web form
- Multi-tenant: `tenantId` in request body; TRIAGE_TENANT_ID/TRIAGE_TEAM_ID for IMAP fallback
- Rate limiting: Redis sliding window, 10 req/hour per IP, fail-open if Redis down
- No CSAT in resolution email; no engineer notes exposed to external requesters

### Backend Dev Agent Jobs
- [x] `B-TI-1` — SQL migration `0007_ticket_intake.sql`: adds `source`, `requester_email`, `requester_name`, `related_ticket_id` to `Tickets`; creates `CategoryRouting` table
- [x] `B-TI-2` — Drizzle schema `category-routing.ts`; updated `tickets.ts` + `index.ts`
- [x] `B-TI-3` — `packages/config/src/env.ts`: added Sprint 17 env vars (APP_BASE_URL, EMAIL_*, INTAKE_EMAIL_*, TRIAGE_*, INTAKE_SYSTEM_USER_ID)
- [x] `B-TI-4` — `dto/index.ts`: extended `CreateTicketDto` and `TicketListQueryDto` with `source` filter
- [x] `B-TI-5` — `NotificationsService`: added `queueIntakeAck` + `queueIntakeResolved` methods; `IntakeAckPayload` + `IntakeResolvedPayload` interfaces
- [x] `B-TI-6` — `TicketsService`: stores new fields on create; fires intake ACK if source = EMAIL/SELF_SERVICE; fires resolved email on RESOLVED status update
- [x] `B-TI-7` — `AdminService`: `listCategoryRouting`, `upsertCategoryRouting` (MERGE), `deleteCategoryRouting`
- [x] `B-TI-8` — `trpc/router.ts`: source filter on `tickets.list`; `relatedTicketId` on `tickets.create`; 3 new `admin.categoryRouting.*` procedures
- [x] `B-TI-9` — `IntakeService`: `createFromWebForm` (SLA lookup, DB insert, team assign, ACK); IMAP poller with 5-min dedup; rate limiting
- [x] `B-TI-10` — `IntakeController`: `POST /api/v1/request` — public, rate-limited, validated; no auth guard
- [x] `B-TI-11` — `IntakeModule` + `AppModule` wiring
- [x] `B-TI-12` — `notifications.worker.ts`: handles `INTAKE_ACK` + `INTAKE_RESOLVED` email sending via nodemailer; fallback to jsonTransport in dev
- [x] `B-TI-13` — `workers/jobs/src/index.ts`: `notificationsWorker` registered + graceful shutdown

### Frontend Dev Agent Jobs
- [x] `F-TI-1` — Public web form at `app/(public)/request/page.tsx` — no Clerk, 5-field form, submits to `POST ${NEXT_PUBLIC_API_URL}/api/v1/request`; confirmation screen with ticket ref
- [x] `F-TI-2` — Admin routing config tab (new tab in Admin Settings) — wired to `trpc['admin.categoryRouting.list']` and `trpc['admin.categoryRouting.upsert']`; inline add/edit form; delete with confirm
- [x] `F-TI-3` — Ticket list + drawer updates: source badge ("Via Web Form" / "Via Email" / "Internal"), requesterEmail/requesterName shown in drawer requester section

### QA Checks (to run after frontend complete)
- [ ] `POST /api/v1/request` with valid payload creates SELF_SERVICE ticket, returns ticketRef
- [ ] Rate limiting: 11th request in sliding window returns 429
- [x] Validation: empty fields + invalid email returns 400 with field errors ← ✅ verified
- [x] DI wiring: IntakeService injects correctly into IntakeController ← ✅ verified (required explicit `@Inject`)
- [ ] ACK email queued to notifications queue on ticket create (SELF_SERVICE/EMAIL)
- [ ] Resolved email queued when ticket → RESOLVED and `requesterEmail` set
- [ ] `admin.categoryRouting.list` returns correct rows
- [ ] `admin.categoryRouting.upsert` creates new + overwrites existing routing rule
- [ ] Source badge visible in ticket list and ticket drawer
- [x] Public form accessible without Clerk session ← layout.tsx has no ClerkProvider dependency

### Known Issues / Env Requirements
- `INTAKE_SYSTEM_USER_ID` must be set to a valid User UUID before web form creates tickets
- `EMAIL_HOST/USER/PASS` optional in dev — falls back to jsonTransport (no emails sent)
- `INTAKE_EMAIL_*` optional — if not set, IMAP poller is disabled (logged at startup)
- Workers process must be started via ecosystem.config.cjs (uses node `--env-file` flag) — tsx watch mode doesn't have nvm PATH



---

## Sprint 1–2 · Foundation & Auth

**Target milestone:** M1  
**Status:** ✅ COMPLETE — merged to `dev` at commit `3f2f083`

### Backend Dev Agent Jobs
- [x] `B1-1` — Monorepo scaffold: `turbo.json`, `package.json` workspaces, all package stubs
- [x] `B1-2` — Drizzle MSSQL schema: `tenants`, `users`, `roles`, `teams` (all with `tenant_id`)
- [x] `B1-3` — MSSQL migration: `0001_initial_schema.sql`
- [x] `B1-4` — NestJS `AuthModule`: ClerkJwtGuard, internal JWT issuance, `useTenantSession` helper
- [x] `B1-5` — Clerk webhook handler: JIT user provisioning on `user.created` event
- [x] `B1-6` — tRPC router stub: `users.me`, `users.list`, `teams.list`
- [x] `B1-7` — NestJS `AdminModule`: user CRUD, team CRUD, role assignment
- [x] `B1-8` — Export all types to `packages/types/src/trpc.ts`

### Frontend Dev Agent Jobs
- [x] `F1-1` — Next.js 15 App Router scaffold: layouts, route groups `(auth)` and `(app)`
- [x] `F1-2` — Tailwind + ShadCN/UI setup; port design tokens from `style-v2.css` to `tailwind.config.ts`
- [x] `F1-3` — Sidebar component (desktop full, tablet icon rail, mobile bottom nav)
- [x] `F1-4` — Login page — Clerk `<SignIn />` with Lotris Appearance API styling
- [x] `F1-5` — User & Team management page (ADMIN role)
- [x] `F1-6` — tRPC client setup in `apps/web/lib/trpc.ts`

### QA Gate Checks — M1
- [x] Login works end-to-end with Google social login via Clerk
- [x] New user provisioned in MSSQL on first login (webhook fires)
- [x] Protected routes return 401 without valid Clerk JWT
- [x] Internal JWT contains `{ tenantId, userId, role }` — no MSSQL IDs
- [x] Team CRUD works — data isolated per `tenantId`
- [x] Sidebar renders correctly at 1280px, 768px, 375px

---

## Sprint 3–4 · Ticket Core

**Target milestone:** M2  
**Status:** ✅ COMPLETE — branch `feature/sprint-3-4-tickets`

### Backend Dev Agent Jobs
- [x] `B3-1` — MSSQL schemas: `tickets`, `ticket_comments`, `ticket_history`, `sla_configs`, `attachment_refs`
- [x] `B3-2` — MSSQL migration: `0002_ticket_core.sql`
- [x] `B3-3` — Ticket lifecycle state machine: transition guards, status enum, transition writes `ticket_history` + audit log
- [x] `B3-4` — `TicketsModule` REST v1: `POST /api/v1/tickets`, `GET /api/v1/tickets` (filtered, paginated), `GET /api/v1/tickets/:id`, `PATCH /api/v1/tickets/:id/status`
- [x] `B3-5` — Comments API: `POST/GET /api/v1/tickets/:id/comments` (internal flag support)
- [x] `B3-6` — Attachment refs: `POST /api/v1/tickets/:id/attachments` (stores S3 key + metadata in MSSQL; S3 upload is frontend-direct)
- [x] `B3-7` — tRPC procedures: `tickets.list` (queue-ordered by priority + sla_deadline), `tickets.get`, `tickets.create`, `tickets.updateStatus`, `tickets.addComment`, `tickets.getComments`, `tickets.getHistory`
- [x] `B3-8` — SLA config REST: `GET/PATCH /api/v1/admin/sla-config` (per-tenant pickup + resolution SLA values, ADMIN-only)
- [x] `B3-9` — Basic notification triggers: fire BullMQ `notifications` job on ticket created, assigned, resolved, escalated

### Frontend Dev Agent Jobs
- [x] `F3-1` — Tickets list page (`app/(app)/tickets/page.tsx`): filterable table — status, priority; SLA countdown badge; pagination
- [x] `F3-2` — Ticket detail drawer (`components/tickets/ticket-drawer.tsx`): full ticket view, status history timeline, comment thread, status action buttons per role
- [x] `F3-3` — Create ticket modal (`components/tickets/create-ticket-modal.tsx`): title, description, priority select, team select
- [x] `F3-4` — Ticket status action bar: role-aware action buttons (Claim, Reassign, Escalate, Resolve, Close) using `PATCH .../status`
- [x] `F3-5` — SLA countdown component (`components/tickets/sla-badge.tsx`): live countdown; green→amber→red colour progression
- [x] `F3-6` — tRPC hooks wiring: `trpc.tickets.list`, `trpc.tickets.get`, `trpc.tickets.create` via `@/lib/trpc`

### QA Gate Checks — M2
- [ ] `POST /api/v1/tickets` creates ticket in MSSQL with correct `tenantId`, status `NEW`
- [ ] Status transitions enforce valid graph (e.g. `NEW → IN_PROGRESS` rejected; `NEW → TEAM_ASSIGNED` accepted)
- [ ] Every status change writes a `ticket_history` row + `audit_log` row
- [ ] `GET /api/v1/tickets` returns only tickets for the authenticated user's tenant
- [ ] Comment with `isInternal: true` not visible to ENGINEER role, visible to TEAM_LEAD+
- [ ] SLA countdown badge turns amber at ≤50% time remaining, red at ≤20%
- [ ] Tickets list is ordered by `priority ASC (1=highest), sla_deadline ASC`
- [ ] Create ticket modal submits and new row appears in table without full page reload
- [ ] Ticket detail drawer loads all comments and history on open

---

## Sprint 5–6 · Queue Engine

**Target milestone:** M3  
**Status:** ✅ COMPLETE — branch `feature/sprint-5-6-queue`

### Backend Dev Agent Jobs
- [x] `B5-1` — MSSQL schema: `queue_configs` table (`max_capacity_per_engineer`, `pickup_sla_minutes`, `resolution_sla_minutes`, `auto_assign_enabled`, nullable `team_id`). Migration: `0003_queue_engine.sql`
- [x] `B5-2` — `QueueModule` REST v1: `GET /api/v1/queue` (engineer queue), `POST /api/v1/queue/claim/:ticketId` (controlled pickup with capacity check), `GET /api/v1/queue/health` (status counts + SLA breach + workload), `GET|PATCH /api/v1/queue/config` (ADMIN)
- [x] `B5-3` — `sla-timers.worker.ts`: BullMQ worker handling `pickup-sla-check` (marks breach, triggers auto-assign) and `resolution-sla-check` (marks breach, escalates, notifies manager)
- [x] `B5-4` — `auto-assign.worker.ts`: least-loaded engineer algorithm, Redis mutex `SET auto-assign:lock:{ticketId} NX EX 10000`, fallback on all-at-capacity, enqueues resolution SLA + TICKET_ASSIGNED notification
- [x] `B5-5` — Wire pickup SLA timer in `TicketsService.updateStatus` when transitioning to `TEAM_ASSIGNED`
- [x] `B5-6` — `workers/jobs/src/index.ts` updated: starts `slaTimersWorker` and `autoAssignWorker` on process boot, includes both in graceful shutdown
- [x] `B5-7` — tRPC procedures: `queue.list`, `queue.claim`, `queue.health`

### Frontend Dev Agent Jobs
- [x] `F5-1` — Queue page (`app/(app)/queue/page.tsx`) + `components/queue/queue-table.tsx`: engineer queue view, Claim button (disabled at capacity), workload indicator `X / max`, pagination, 30s auto-refresh, reuses `SlaBadge`
- [x] `F5-2` — `components/dashboard/queue-health-panel.tsx`: status distribution bars, SLA breach badges (amber pickup / red resolution), top-5 engineer workload list, 60s auto-refresh

### QA Gate Checks — M3
- [ ] `GET /api/v1/queue` returns only UNASSIGNED/TEAM_ASSIGNED tickets for the auth user's team, ordered priority ASC → sla_pickup_deadline ASC
- [ ] `POST /api/v1/queue/claim/:id` blocks if engineer is at max capacity
- [ ] Claiming a ticket sets status → ASSIGNED, records history, fires TICKET_ASSIGNED notification, enqueues resolution SLA timer
- [ ] Pickup SLA timer fires after deadline; marks `sla_pickup_breached = 1`, triggers auto-assign job
- [ ] Auto-assign worker assigns to least-loaded engineer; does not exceed `max_capacity_per_engineer`
- [ ] Redis mutex prevents double-assignment when two pickup timers fire simultaneously
- [ ] Resolution SLA timer marks `sla_resolution_breached = 1`, transitions ticket → ESCALATED, notifies manager
- [ ] Queue config (per-tenant, per-team) is respected by claim and auto-assign logic
- [ ] Queue health panel shows accurate status counts and SLA breach numbers
- [ ] Claim button is disabled for engineer at capacity and while claim is in-flight

---

## Sprint 7 · Task Management

**Target milestone:** M4  
**Status:** ✅ COMPLETE — branch `feature/sprint-7-tasks`

### Backend Dev Agent Jobs
- [x] `B7-1` — MSSQL schemas: `tasks`, `task_assignments`, `task_checklist_items`. Migration: `0004_task_management.sql`
- [x] `B7-2` — `TasksModule` REST v1: `POST /api/v1/tasks`, `GET /api/v1/tasks`, `GET /api/v1/tasks/:id`, `PATCH /api/v1/tasks/:id`, `POST /api/v1/tasks/:id/checklist`, `PATCH /api/v1/tasks/:id/checklist/:itemId/toggle`, `DELETE /api/v1/tasks/:id/checklist/:itemId`, `POST /api/v1/tasks/:id/assignees`, `POST /api/v1/tasks/:id/complete`
- [x] `B7-3` — Task business logic: `LEAD_ASSIGNED` vs `SELF_LOGGED` source determination from role; visibility rules (engineer sees own tasks + assigned tasks; lead sees team); progress computed from checklist completion or `progressOverride`; auto-complete when all checklist items + all assignment rows done
- [x] `B7-4` — tRPC procedures: `tasks.list`, `tasks.get`, `tasks.create`, `tasks.update`, `tasks.addChecklistItem`, `tasks.toggleChecklistItem`, `tasks.complete`

### Frontend Dev Agent Jobs
- [x] `F7-1` — Tasks page (`app/(app)/tasks/page.tsx`) + `components/tasks/tasks-table.tsx`: filterable table by status + source, progress bar inline, 60s refresh, row-click opens drawer
- [x] `F7-2` — `components/tasks/task-drawer.tsx`: full task view, progress bar, live checklist with toggle + add item, assignees list per-completion, status action footer (Start / Mark Complete / Cancel)
- [x] `F7-3` — `components/tasks/create-task-modal.tsx`: two-mode form (Self-log / Assign to engineers), task type select, due date picker, assignee UUID list builder

### QA Gate Checks — M4
- [ ] `POST /api/v1/tasks` with no `assigneeIds` creates `SELF_LOGGED` task owned by caller
- [ ] `POST /api/v1/tasks` with `assigneeIds` from TEAM_LEAD+ creates `LEAD_ASSIGNED` task + `Task_Assignments` rows
- [ ] Engineer attempting to assign task to others receives 400
- [ ] Engineer cannot view tasks they did not create or are not assigned to (401/403)
- [ ] Toggling all checklist items to complete sets task `status = COMPLETED`, `progress_override = 100`
- [ ] Marking own assignment complete when all assignees done → task auto-completes
- [ ] Self-logged tasks are visible to the team lead in `GET /api/v1/tasks`
- [ ] `PATCH /api/v1/tasks/:id/status = CANCELLED` blocks further updates
- [ ] Task drawer checklist items reflect server state immediately after toggle (optimistic invalidation)

---

## Sprint 8–10 · KPI Engine

**Target milestone:** M5
**Status:** ✅ COMPLETE — branch `feature/sprint-8-10-kpi`, merged to `dev` at commit `d0c7792`, May 2026

### Backend Dev Agent Jobs

- [x] `B8-1` — MSSQL schemas: `kpi_definitions`, `kpi_team_targets`, `kpi_engineer_assignments`, `kpi_agreements`, `kpi_agreement_areas`, `kpi_agreement_metrics`, `kpi_actuals`, `kpi_results`. Migration: `0005_kpi_engine.sql`
- [x] `B8-2` — `KpiModule`: REST v1 — KPI Definitions CRUD (`IT_MANAGER` only): `POST/GET/PATCH/DELETE /api/v1/kpi/definitions`; per-team target overrides: `GET/PATCH /api/v1/kpi/definitions/:id/team-targets`
- [x] `B8-3` — Per-engineer KPI assignment REST: `GET/POST/PATCH /api/v1/kpi/assignments` (Team Lead scope — own team only); individual target overrides stored in `kpi_engineer_assignments`
- [x] `B8-4` — KPI Agreement REST: `POST /api/v1/kpi/agreements` (create Draft), `GET /api/v1/kpi/agreements/:id`, `PATCH /api/v1/kpi/agreements/:id/areas` (add/update areas + metric rows), `POST /api/v1/kpi/agreements/:id/submit` (Lead submits → Pending Review), `POST /api/v1/kpi/agreements/:id/accept` (Engineer accepts → Active)
- [x] `B8-5` — Document upload + column mapping: `POST /api/v1/kpi/agreements/:id/upload` (parse Excel/CSV via `exceljs`; return column preview); `POST /api/v1/kpi/agreements/:id/import` (accept column mapping, insert metric rows)
- [x] `B8-6` — KPI actuals ingestion: auto-ingest on ticket resolve (`TicketsService`) and task complete (`TasksService`) — write `kpi_actuals` row linked to the agreement metric; manual entry endpoint `POST /api/v1/kpi/actuals`
- [x] `B8-7` — Scoring engine: `KpiScoringService` — computes weighted score per `kpi_agreement_area` and overall score for a period; stores result in `kpi_results`; callable on-demand and via BullMQ `score-period` job at period end
- [x] `B8-8` — tRPC procedures: `kpi.definitions.list`, `kpi.assignments.list`, `kpi.agreements.list`, `kpi.agreements.get`, `kpi.results.get`, `kpi.actuals.list`

### Frontend Dev Agent Jobs

- [x] `F8-1` — KPI Setup page (`app/(app)/kpis/page.tsx`) + `components/kpis/kpi-definitions-table.tsx`
- [x] `F8-2` — KPI Assignments panel (`components/kpis/kpi-assignments-panel.tsx`)
- [x] `F8-3` — KPI Agreement builder (`components/kpis/kpi-agreement-builder.tsx`): area groups, metric rows, weight-sum validation, CSV/Excel upload with column mapping wizard, submit / accept actions
- [x] `F8-4` — KPI Dashboard (`components/kpis/kpi-dashboard.tsx`): overall score ring, per-area RAG cards, recompute button; wired to `trpc.kpi.results.get`
- [x] `F8-5` — tRPC hooks wiring: all `trpc.kpi.*` procedures; 60s refresh on dashboard scores

### QA Gate Checks — M5
- [x] All 8 MSSQL KPI tables + migration created
- [x] Agreement status machine: Draft → Pending Review → Active
- [x] Scoring engine: weighted per-area + overall score, stored in `kpi_results`
- [x] KPI dashboard RAG indicators: green ≥ target, amber within 10%, red > 10% below
- [x] CSV/Excel import with column mapping wizard
- [x] All KPI data scoped to `tenantId`
- [x] Build clean: workers ✅ api ✅ web ✅ (11 pages including `/kpis`)

---

## Sprint 11–12 · Reporting & Full Dashboard

**Target milestone:** M6  
**Status:** ✅ COMPLETE — M6 gate passed. Merged to `dev` at `f900bfc`.

**Deliverable:** Analytics layer (PostgreSQL ETL), Redis dashboard cache, fully live main dashboard, reports module with PDF + Excel generation, scheduled report delivery via email.

**Reference mockups:** `mockups/02-dashboard-v2.html`, `mockups/05-reports-v2.html`

---

### Backend Dev Agent Jobs

- [x] `B11-1` — PostgreSQL analytics schemas (`packages/db/src/schemas/postgres/`): `analytics_ticket_daily`, `analytics_engineer_perf`, `analytics_kpi_summary`, `analytics_sla_daily`, `reports`, `report_schedules`. Drizzle `postgres-js` tables. Migration: `packages/db/migrations/pg/0001_analytics.sql`
- [x] `B11-2` — `EtlService` + BullMQ `etl-sync` worker: incremental sync MSSQL → PostgreSQL; daily full-batch job via BullMQ repeatable queue (cron `5 0 * * *`)
- [x] `B11-3` — `DashboardCacheService`: pre-compute dashboard metrics into Redis with 30s TTL; graceful degradation to PostgreSQL if Redis unavailable
- [x] `B11-4` — `AnalyticsModule` REST + tRPC: `GET /api/v1/dashboard/summary|ticket-analytics|engineer-perf|queue-health`; tRPC: `dashboard.summary`, `dashboard.ticketAnalytics`, `dashboard.engineerPerf`, `dashboard.queueHealth`
- [x] `B11-5` — `ReportsModule` REST: `POST /api/v1/reports/generate`, `GET /api/v1/reports`, `GET /api/v1/reports/:id/status`, `GET /api/v1/reports/:id/download` (file stream)
- [x] `B11-6` — `ReportsPdfService` (PDFKit): Ticket Summary, SLA Compliance, KPI Report, Engineer Perf templates; file stored in OS temp dir, streamed on request
- [x] `B11-7` — `ReportsExcelService` (ExcelJS): formatted `.xlsx` with styled header rows for all 4 report types
- [x] `B11-8` — `ReportsService` scheduled reports CRUD (`POST/GET/DELETE /api/v1/reports/schedules`); schedules stored in `report_schedules` PG table

### Frontend Dev Agent Jobs

- [x] `F11-1` — Full Main Dashboard page (`app/(app)/dashboard/page.tsx`): stat cards, queue health, ticket analytics, engineer perf table; all wired to `trpc.dashboard.*`; 30s auto-refresh
- [x] `F11-2` — `components/dashboard/stat-cards.tsx`: 4 summary stat cards (Open Tickets, SLA Compliance, Avg Resolution, Team KPI Score); color-coded thresholds; skeleton loading
- [x] `F11-3` — `components/dashboard/ticket-analytics.tsx`: ticket volume CSS bar chart (created vs resolved), SLA compliance bar; 7-day window
- [x] `F11-4` — `components/dashboard/engineer-perf-table.tsx`: client-side sortable table — engineer, tickets resolved, SLA breaches, avg resolution hrs, KPI score (color-coded)
- [x] `F11-5` — Reports page (`app/(app)/reports/page.tsx`) + `components/reports/reports-layout.tsx`: sidebar with 4 report types + History/Scheduled tabs
- [x] `F11-6` — `components/reports/generate-report-form.tsx`: report type, format, date range; polls job status every 2s; download via `window.open`
- [x] `F11-7` — `components/reports/scheduled-reports.tsx`: schedule list (frequency badges), create/delete modal; recipients as comma-separated emails

### QA Gate Checks — M6

- [x] ETL upsert on conflict — stale dates never duplicated (`onConflictDoUpdate`)
- [x] Dashboard cache degrades gracefully to PostgreSQL when Redis unavailable
- [x] Redis TTL 30s set via `setEx`; keys scoped per tenant
- [x] PDF report generates for all 4 report types via PDFKit; streamed (no memory buffering)
- [x] Excel export produces valid `.xlsx` for all 4 sheet types with styled header rows
- [x] Scheduled reports CRUD in PG `report_schedules` table; tenant-scoped
- [x] Cross-tenant isolation: every PG query includes `eq(table.tenantId, auth.tenantId)`
- [x] Column names verified: `slaResolutionBreached`, `assigneeId` (from tickets schema)
- [x] `selectDistinct` replaced with `select + groupBy` (MssqlDb compatibility)
- [x] `@nestjs-modules/ioredis` import removed; uses `global.__lotrisRedis` pattern
- [x] Build clean: workers ✅ api ✅ web ✅ (12 routes)

**Commit:** `e46e65e` on `feature/sprint-11-12-reporting`  
**Merge commit:** `f900bfc` on `dev`

---

## Sprint 13 · System Health Monitoring

**Target milestone:** M7  
**Status:** ✅ COMPLETE — M7 gate passed. Merged to `dev`.

**Deliverable:** SysAdmin ops dashboard at `/system-health` — live SSE stream of 6-service health checks, BullMQ queue depths, incident log, per-service detail panel, restart controls with 60s cooldown enforcement.

**Reference mockup:** `mockups/10-sysadmin-ops-v2.html`

---

### Backend Dev Agent Jobs

- [x] `B13-1` — `HealthService` (`apps/api/src/modules/health/health.service.ts`): 6-service checks — `nestjs-api` (process metrics), `nextjs-web` (HTTP probe), `mssql-db` (SELECT 1 latency), `postgres-analytics` (SELECT 1 latency), `redis` (PING + memory), `bullmq-workers` (queue reachability); all return `ServiceHealthEntry` with UP/DEGRADED/DOWN status
- [x] `B13-2` — Queue depths: `getQueueDepths()` polls 4 queues (sla-timers, auto-assign, notifications, report-gen) via BullMQ `getJobCounts()`; returns `QueueDepthEntry[]`
- [x] `B13-3` — Incident log: `getIncidents(limit)` queries `Audit_Logs` WHERE `action LIKE 'SERVICE_%'` ordered by `createdAt DESC`
- [x] `B13-4` — Restart API: `requestRestart(serviceName, actorId, tenantId)` — Redis NX cooldown key (60s TTL), writes audit log; for `nestjs-api` schedules `process.exit(0)` after 1500ms
- [x] `B13-5` — `HealthController` — `GET /health/snapshot` (ADMIN, full snapshot), `GET /health/sse` (ADMIN, 1s SSE stream via `reply.hijack()`), `POST /health/restart/:serviceName` (ADMIN, 6-service allow-list)
- [x] `B13-6` — tRPC: `health.getSnapshot`, `health.getIncidents`, `health.restartService` procedures (all `adminProcedure`)
- [x] `B13-7` — `packages/types`: `ServiceHealthEntry`, `QueueDepthEntry`, `HealthSnapshot`, `IncidentEntry` interfaces exported

### Frontend Dev Agent Jobs

- [x] `F13-1` — `apps/web/hooks/useEventSource.ts`: fetch-based SSE hook with Clerk JWT auth, auto-reconnect, `enabled` control
- [x] `F13-2` — `apps/web/app/(app)/system-health/page.tsx`: server component, ADMIN/SUPERADMIN auth guard, redirects otherwise
- [x] `F13-3` — `apps/web/components/system-health/system-health-client.tsx`: SSE + polling hybrid, summary chips, 2-col layout, service selection, restart flow wiring
- [x] `F13-4` — `apps/web/components/system-health/service-table.tsx`: service rows with status badge (pulse dot), CPU/memory mini bars, uptime, ping, action buttons
- [x] `F13-5` — `apps/web/components/system-health/queue-depths.tsx`: 6-column queue table (Waiting, Active, Failed, Delayed, Completed 1h) with color-coded counts
- [x] `F13-6` — `apps/web/components/system-health/incident-log.tsx`: incident entries with colored dot, title, service, timestamp, resolved/open badge
- [x] `F13-7` — `apps/web/components/system-health/detail-panel.tsx`: service stat grid (CPU, Memory, Uptime, Ping), restart/test buttons, cooldown note; reuses `StatusBadge`
- [x] `F13-8` — `apps/web/components/system-health/restart-modal.tsx`: confirmation modal requiring exact service-id typed to unlock confirm button, Escape-to-close

### QA Gate Checks — M7

- [x] SSE stream uses `reply.hijack()` — no Fastify response auto-finalization conflict
- [x] SSE client uses `fetch` (not `EventSource`) — supports `Authorization: Bearer` header
- [x] All 6 service checks gate on correct DEGRADED thresholds (MSSQL >200ms, PG >300ms, Redis >50ms)
- [x] Restart cooldown enforced via Redis NX key (60s TTL) — duplicate requests return 409
- [x] Restart allow-list enum in tRPC schema prevents arbitrary service names
- [x] Incident log scoped to `SERVICE_` prefix audit actions
- [x] `/system-health` server component redirects non-ADMIN roles to `/dashboard`
- [x] TypeScript clean for new files in both `apps/api` and `apps/web`

**Feature branch:** `feature/sprint-13-system-health-monitoring` at `b901271`  
**Merge commit:** on `dev`

---

## Sprint 14–15 · UI Polish + Dashboard QA + Tickets Page Repair

**Target milestone:** M8  
**Status:** ✅ COMPLETE — branch `feature/sprint-14-layout-polish`

**Deliverable:** Full UI consistency pass against v2 mockups; dark mode; dashboard chart accuracy; tickets page fully functional (search, filters, pagination, team column, drawer); role-gated ticket assignment.

**Reference mockups:** `mockups/02-dashboard-v2.html`, `mockups/03-tickets-v2.html`, `mockups/style-v2.css`

---

### Backend Dev Agent Jobs

- [x] `B14-1` — `TicketListQueryDto`: add `search?: string` field (validated with `@IsOptional`, `@IsString`)
- [x] `B14-2` — `TicketsService.list()`: rewrite using raw SQL with `COUNT(*) OVER()` window function — returns `{ rows, total, page, limit }`; LEFT JOIN `teams` for `teamName`; LIKE search on title + id (sanitised `''` escaping); all conditions applied to both count and data query
- [x] `B14-3` — tRPC `tickets.list`: add `search: z.string().optional()` to input schema
- [x] `B14-4` — tRPC `tickets.assign`: new `protectedProcedure` — `ADMIN`/`SUPERADMIN`/`TEAM_LEAD` role guard; calls new `TicketsService.assign()`
- [x] `B14-5` — `TicketsService.assign()`: auto-walks state machine from any starting status to `ASSIGNED` — `NEW → TEAM_ASSIGNED → UNASSIGNED → ASSIGNED` — preserving all SLA timer, history, and notification side-effects at each step; handles re-assignment of already-assigned tickets

### Frontend Dev Agent Jobs

- [x] `F14-1` — **Dark mode**: `next-themes` `ThemeProvider` wired in `Providers`; `.dark` CSS class block added to `globals.css` with full token overrides (background, surface, text, border, status tints); Moon/Sun toggle button in topbar
- [x] `F14-2` — **Ticket Volume chart** (`dashboard-page-client.tsx`): rebuilt to dual-bar (Opened = indigo, Resolved = green) matching mockup — legend, 8-month filter `<select>`, Y-axis labels, grid lines at 25%/50%/75%/100%, floating "247" badge on in-progress last bar
- [x] `F14-3` — **Tickets search**: `debouncedSearch` state (350ms); passed as `search` param to tRPC query; resets `page` to 1 on change
- [x] `F14-4` — **Priority filter**: controlled `<select>` with `value={priority ?? ''}` and `onChange` wired to `setPriority` + `setPage(1)`; option values are numeric strings `"1"–"4"`
- [x] `F14-5` — **Pagination fix**: `totalPages = Math.ceil(liveData.total / 25)`; sliding window of up to 5 page buttons; prev/next disabled at bounds; footer shows real `Showing X–Y of N tickets`
- [x] `F14-6` — **Team column**: added `<th>Team</th>` header + `<td>` with indigo pill badge; `teamName` sourced from API response `rows[n].teamName`
- [x] `F14-7` — **Ticket drawer UUID fix**: `setSelectedTicketId(t.rawId ?? t.id)` — passes raw UUID to drawer instead of display ID `TKT-XXXX`; `liveRows` mapping now retains `rawId` field; DEMO fallback rows get `rawId: t.id`
- [x] `F14-8` — **Tab change page reset**: `setPage(1)` added to tab `onClick` alongside `setActiveTab`
- [x] `F14-9` — **Assign To section in ticket drawer** (`ticket-drawer.tsx`): queries `users.me` for role check and `users.list` for engineer dropdown; `canAssign = role ∈ {ADMIN, SUPERADMIN, TEAM_LEAD}`; section renders conditionally; engineer `<select>` filters to `ENGINEER` and `TEAM_LEAD` roles; shows `(unavailable)` suffix; calls `tickets.assign` mutation; inline success/error feedback; refetches ticket + history on success and invalidates ticket list

### QA Gate Checks — M8

- [x] Dark mode toggle persists across page reloads (localStorage via `next-themes`)
- [x] All surface/text/border tokens correct in `.dark` — no hardcoded white or `#fff` bleed-through
- [x] Ticket Volume chart matches `02-dashboard-v2.html` mockup: dual bars, legend, last-bar badge, Y-axis
- [x] Search input debounced — no query fired until 350ms after last keystroke
- [x] Priority filter `<select>` correctly controlled — changing value re-queries immediately
- [x] Pagination footer shows accurate `Showing X–Y of N` using real `total` from API
- [x] Team column visible in tickets table; shows indigo pill with team name or `–` for unassigned
- [x] Clicking ticket row opens drawer with correct UUID — no `400 Bad Request` on `tickets.get`
- [x] Assigning a `NEW` ticket auto-walks `NEW → TEAM_ASSIGNED → UNASSIGNED → ASSIGNED` — no state machine error
- [x] Assign section hidden for `ENGINEER` and `EXECUTIVE` roles
- [x] Re-assigning an already-`ASSIGNED` ticket works without error
- [x] `tenantId` filter present in all new SQL — multi-tenancy invariant maintained
- [x] TypeScript clean: no `any`, no suppressed errors across all modified files

---

## Sprint 16 · QA Fixes · Monitor Wall · Role Visibility · KPI My Agreement

**Target milestone:** M9  
**Status:** ✅ COMPLETE — `dev` @ `3e2b17e`

**Deliverable:** Three QA items (Queue Team Workload role-scoping, Tickets/Tasks role-context banners, Monitor real DB data), animated priority ticker on Monitor wall, light/dark toggle on Monitor, cross-team access grants UI, mobile responsiveness, plus: KPI My Agreement view for Engineers and Team Leads, `kpiAgreementProcedure` middleware for TEAM_LEAD builder access, Daily measurement period, submit-for-review button improvements.

---

### Backend Dev Agent Jobs

- [x] `B16-1` — `monitor.stats` tRPC procedure SQL fixes: `sla_deadline` → `sla_resolution_deadline`; `AS open` → `AS openCount` (MSSQL reserved keyword); `ORDER BY priority ASC` (1=Critical); `SELECT TOP 20` for top tickets
- [x] `B16-2` — `dashboard.teamWorkload` tRPC procedure: returns `{ id, name, queued, openCount }` per team; elevated roles see all teams, non-elevated filtered to `myTeamId`
- [x] `B16-3` — TeamAccessGrants schema (`packages/db/src/schemas/mssql/team-access-grants.ts`); migration `0006_team_access_grants.sql`; AdminService CRUD; cross-team read grants
- [x] `B16-4` — RBAC filtering hardened in `TicketsService` and `TasksService`: Engineers see own/assigned items only; Team Leads see team scope; elevated roles see all
- [x] `B16-5` — `kpiAgreementProcedure` added to `apps/api/src/trpc/trpc.ts`: allows SUPERADMIN, ADMIN, IT_MANAGER, TEAM_LEAD to access agreement builder
- [x] `B16-6` — `kpi.agreements.create` + `kpi.agreements.setAreas` migrated from `managerProcedure` to `kpiAgreementProcedure` (granting TEAM_LEAD builder access)
- [x] `B16-7` — `kpi.agreements.accept` new `protectedProcedure` in router: input `{ agreementId: uuid }`, calls `KpiService.acceptAgreement(auth, agreementId)` — enforces `PENDING_REVIEW` status and `engineerId === auth.userId`
- [x] `B16-8` — `MeasurementPeriod` enum in `apps/api/src/modules/kpi/dto/index.ts` extended with `'DAILY'`; all relevant Zod schemas + router inputs updated
- [x] `B16-9` — `KpiService.listAgreements()` auto-scopes `ENGINEER` role to own `userId`; accepts optional `engineerId` filter; `ClerkJwtGuard` Logger added for real error logging

### Frontend Dev Agent Jobs

- [x] `F16-1` — **Queue Team Workload role-scope** (`queue-table.tsx`): `ELEVATED_ROLES = {ADMIN, SUPERADMIN, IT_MANAGER}` → "All Teams Workload" with all teams; others → "My Team Workload" filtered to `myTeamId`; 8-color `WORKLOAD_COLORS` array using CSS vars
- [x] `F16-2` — **Tickets role-context banner** (`tickets-table.tsx`): queries `users.me`; Engineers → indigo banner; Team Leads → green banner; elevated roles → no banner
- [x] `F16-3` — **Tasks role-context banner** (`tasks-table.tsx`): same pattern — Engineers → "My Tasks" header + indigo; Team Leads → "Team Tasks" header + green
- [x] `F16-4` — **Monitor page wired to real DB** (`monitor-client.tsx`): full rewrite; `monitor.stats` via `MonitorProviders` (public, no auth); sub-components: StatCard, SectionTitle, Chip, SkeletonRows, EmptyState; 8-color distinct chip colors
- [x] `F16-5` — **Animated priority ticker** (`monitor-client.tsx`): top-20 tickets duplicated for seamless CSS loop; `animation: tickerScroll linear infinite`; hover-to-pause; fade masks via `WebkitMaskImage`
- [x] `F16-6` — **Light/dark toggle on Monitor** (`monitor-client.tsx`): Two `TC` ThemeConfig objects — `DARK` and `LIGHT`; Sun/Moon icon toggle; `localStorage` persisted; threaded as `t` prop through all sub-components
- [x] `F16-7` — **Monitor light mode**: `LIGHT.bg = '#c8d3e0'`, `cardBg = '#ffffff'`; `cardBorder` at 66% opacity so cards lift clearly against the dimmed field
- [x] `F16-8` — **Cross-team access admin panel** (`admin-tabs.tsx`, `team-access-panel.tsx`): 3-tab admin UI; Cross-Team Access tab for managing `team_access_grants`
- [x] `F16-9` — **Mobile responsiveness** (`globals.css`): `@media (max-width: 768px)` block; `v2-stats-grid` responsive class; sidebar → bottom nav; hamburger button in topbar
- [x] `F16-10` — **Monitor public route** (`middleware.ts`): `/monitor(.*)` in Clerk `publicRoutes`; `app/monitor/page.tsx` + `layout.tsx` + `MonitorProviders.tsx`
- [x] `F16-11` — **RBAC sidebar** (`sidebar.tsx`): Monitor link visible; nav items role-filtered
- [x] `F16-12` — **Dashboard role-aware variants** (`dashboard-page-client.tsx`): role-specific content and stat card scoping
- [x] `F16-13` — **KPI My Agreement component** (`components/kpis/kpi-my-agreement.tsx`): ENGINEER + TEAM_LEAD view of own agreement; search/filter by period/lead/status; status pills (ALL/DRAFT/PENDING_REVIEW/ACTIVE/CLOSED); read-only area cards with collapsible metric table; Sign-off card (Accept & Sign Off for PENDING_REVIEW); summary sidebar; wired to `kpi.agreements.list` with `engineerId: me.id` filter; `kpi.agreements.accept` mutation
- [x] `F16-14` — **My Agreement page** (`app/(app)/kpis/my-agreement/page.tsx`): App Router page at `/kpis/my-agreement`; metadata `title: 'My KPI Agreement | Lotris'`
- [x] `F16-15` — **Sidebar My Agreement nav** (`sidebar.tsx`): `ClipboardList` icon; visible for `ENGINEER` and `TEAM_LEAD` roles; indented below KPI section
- [x] `F16-16` — **Agreement builder search** (`kpi-agreement-builder.tsx`): search input in card header; filters agreements by engineer name, lead name, period key, or status label
- [x] `F16-17` — **Submit-for-review button fix** (`kpi-agreement-builder.tsx`): `submitError` + `submitDone` state; `onError` handler added; button disabled + "Sending…" during mutation; success green banner; error red banner; `PENDING_REVIEW` shows blue info pill; button only shown for `DRAFT` status; state resets on row change

### QA Gate Checks — M9

- [x] Queue sidebar shows "All Teams Workload" for ADMIN/SUPERADMIN/IT_MANAGER; "My Team Workload" for TEAM_LEAD/ENGINEER
- [x] Tickets page: indigo banner for ENGINEER, green for TEAM_LEAD, none for elevated roles
- [x] Tasks page: ENGINEER sees "My Tasks" + indigo; TEAM_LEAD sees "Team Tasks" + green
- [x] Monitor page (`/monitor`) loads without auth — no Clerk redirect
- [x] Monitor stats serve real DB data — no 500 errors
- [x] SQL verified: `sla_resolution_deadline` column, `openCount` alias, `ORDER BY priority ASC`
- [x] Animated ticker scrolls continuously; pauses on hover; loops seamlessly at −50% translateY
- [x] Light/dark toggle persists across browser refresh via `localStorage`
- [x] Light mode: white cards lift clearly against `#c8d3e0` background
- [x] `kpiAgreementProcedure` enforces SUPERADMIN/ADMIN/IT_MANAGER/TEAM_LEAD; ENGINEER role receives FORBIDDEN
- [x] TEAM_LEAD can create agreements and set areas via `kpi.agreements.create` and `kpi.agreements.setAreas`
- [x] `kpi.agreements.accept` enforces `engineerId === auth.userId` — cannot accept another engineer's agreement
- [x] `/kpis/my-agreement` renders correctly for ENGINEER role — shows own agreements, search/filter works
- [x] `/kpis/my-agreement` renders correctly for TEAM_LEAD role — shows own agreement (own engineer agreements)
- [x] Accept & Sign Off button only visible for `PENDING_REVIEW` status
- [x] After accept, agreement status updates to `ACTIVE` — sign-off card updates accordingly
- [x] Submit-for-review button: disabled + "Sending…" during mutation; green success banner after; red error banner on failure
- [x] Submit button not shown for `PENDING_REVIEW` status (info pill shown instead)
- [x] Sidebar shows "My Agreement" nav item for ENGINEER and TEAM_LEAD; not shown for ADMIN/IT_MANAGER/SUPERADMIN
- [x] Daily measurement period selectable in agreement builder metric rows
- [x] TypeScript clean: `npx tsc --noEmit -p apps/web/tsconfig.json` → exit code 0

---

## Open Issues / Deferred Items
| ---- | --------------------------------------- | ---------- | -------- |
| OI-1 | Notifications queue: 1 failed job (DLQ) | Pre-build  | Monitor  |
| OI-2 | Native mobile app                       | Pre-build  | Deferred to post-v1 |

---

## Phase 2 / Phase 3 Backlog (post-MVP)

- ~~SLA breach prediction + automated alerts~~ → **Sprint 18**
- ~~KPI performance trend analysis with amber/red flags~~ → **Sprint 18**
- Automated quarterly report generation and distribution → Sprint 19
- Engineer workload rebalancing suggestions → Sprint 19
- AI-assisted root cause classification → Phase 3
- Predictive KPI performance forecasting → Phase 3
- Natural language report summaries → Phase 3
- Prometheus / Grafana / Datadog monitoring integrations → Phase 3

---

## Sprint 18 · Phase 2 — SLA Breach Prediction + KPI Trend Analysis

**Target milestone:** M11  
**Status:** ✅ COMPLETE — merged to `dev` 2026-05-13  
**Branch:** `feature/sprint-18-intelligence` (merged)  
**Phase:** 2 — Intelligence

### Goal

Bring predictive and analytical intelligence to Lotris's existing operational data:

1. **SLA Breach Prediction** — Identify in-progress tickets likely to breach their resolution SLA before they do. Surface amber/red warnings in the ticket list and dashboard. Notify the assignee and team lead automatically.
2. **KPI Trend Analysis** — Compute trajectory for each active KPI metric. Flag when a metric is on course to miss its target by period end. Surface sparklines and amber/red flags in the KPI dashboard.

Both features read existing MSSQL + PostgreSQL data. No new user-facing input forms are required. The risk surface is analytics-only (read path); no ticket state machine changes.

---

### Design Decisions

- **SLA prediction model**: Linear projection — `elapsed_time / (elapsed_time + remaining_capacity)`. If projected resolution time > SLA deadline, flag. No ML in Phase 2.
- **KPI trend model**: Linear regression on `KPI_Actuals` rows for the current period. If the projected end-of-period score < target, flag amber (within 10%) or red (>10% below).
- **Prediction cadence**: SLA scan runs every 5 minutes via BullMQ cron (new `sla-predictor` queue). KPI trend scan runs every 30 minutes (`kpi-trend` queue).
- **Warning thresholds (SLA)**:
  - 🟡 Amber: ≥70% of resolution SLA window consumed with ticket still open
  - 🔴 Red: ≥90% of resolution SLA window consumed with ticket still open
- **Warning thresholds (KPI)**:
  - 🟡 Amber: projected score is between 85%–99% of target
  - 🔴 Red: projected score is below 85% of target
- **Dedup**: Alerts fire at most once per ticket per threshold crossing (Redis key `sla-alert:{ticketId}:{level}`, TTL = SLA deadline). KPI alerts fire at most once per metric per period per level.
- **Notification targets**:
  - SLA amber/red → ticket assignee + team lead (email + in-app SSE)
  - KPI amber/red → individual engineer (in-app SSE); team lead (email digest, daily at 08:00)
- **Dashboard widgets**:
  - SLA: amber/red ticket count badges on main dashboard queue section (02); amber/red row colouring in ticket list
  - KPI: sparkline chart per metric in KPI dashboard (04); amber/red flag pill next to each metric
- **New DB columns** (MSSQL): `tickets.sla_warning_level` enum (`NONE | AMBER | RED`) — set by the predictor job; cleared on ticket resolve/close.
- **New DB table** (PostgreSQL): `kpi_trend_snapshots` — stores computed trajectory point per metric per period (for sparkline history).
- **No new tRPC mutations for end users** — all writes are internal (BullMQ jobs only).

---

### Inter-Agent Dependencies

```
B-SI-1 (DB migration + Drizzle schema) must complete before any other backend job.
B-SI-5 (tRPC analytics procedures) must complete before F-SI-1 and F-SI-3.
B-SI-4 (BullMQ jobs) is independent of frontend — can run in parallel with frontend jobs.
F-SI-2 (sparklines) depends on F-SI-1 (KPI dashboard data hook) being wired first.
```

---

### Backend Dev Agent Jobs

- [ ] `B-SI-1` — **DB migration `0008_sla_prediction.sql`**: Add `sla_warning_level` column to `Tickets` (`NVARCHAR(10) DEFAULT 'NONE' CHECK IN ('NONE','AMBER','RED')`). Create `kpi_trend_snapshots` table in PostgreSQL (via Drizzle postgres schema):
  ```sql
  -- PostgreSQL only
  CREATE TABLE kpi_trend_snapshots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    engineer_id UUID NOT NULL,
    kpi_def_id  UUID NOT NULL,
    period_key  VARCHAR(20) NOT NULL,   -- e.g. '2026-Q2'
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actual_to_date NUMERIC(10,4),
    projected_eop  NUMERIC(10,4),
    target         NUMERIC(10,4),
    warning_level  VARCHAR(10) NOT NULL DEFAULT 'NONE'
  );
  CREATE INDEX ON kpi_trend_snapshots (tenant_id, engineer_id, kpi_def_id, period_key);
  ```
  Drizzle MSSQL schema: update `tickets.ts` to add `slaWarningLevel`. Drizzle PG schema: create `kpi-trend-snapshots.ts` in `packages/db/src/schemas/pg/`.

- [ ] `B-SI-2` — **`SlaPredictor` service** (`apps/api/src/modules/tickets/sla-predictor.service.ts`):
  - `computeWarningLevel(ticket: TicketRow, now: Date): 'NONE' | 'AMBER' | 'RED'`
    - Fetch `sla_deadline` + `assigned_at`. Compute `pct = (now - assigned_at) / (sla_deadline - assigned_at)`.
    - Returns `'RED'` if pct ≥ 0.90, `'AMBER'` if pct ≥ 0.70, else `'NONE'`.
  - `scanAndUpdate(tenantId: string)`: SELECT all IN_PROGRESS tickets for tenant, compute warning level, batch UPDATE `sla_warning_level` where changed.
  - `shouldAlert(ticketId, level, redis)`: Redis key `sla-alert:{ticketId}:{level}` — SET NX, TTL to minutes remaining before SLA. Returns false if key already exists.
  - If level changed to AMBER or RED and `shouldAlert` passes: queue `SLA_WARNING` notification job (assignee + team lead, email + SSE).
  - Must include `tenantId` filter on every query. No cross-tenant reads.

- [ ] `B-SI-3` — **`KpiTrendAnalyser` service** (`apps/api/src/modules/analytics/kpi-trend.service.ts`):
  - `computeTrend(engineerId, kpiDefId, periodKey, tenantId)`:
    - SELECT `KPI_Actuals` rows for this engineer + kpi_def + period ordered by `recorded_at`.
    - Simple linear regression: project value at period end date.
    - Fetch target from `KPI_Engineer_Assignments` (with `KPI_Team_Targets` and `KPI_Definitions` fallback).
    - Compute `warningLevel`: if `projected / target < 0.85` → `RED`; if `< 0.99` → `AMBER`; else `NONE`. Invert for direction=`LOWER_IS_BETTER`.
  - `scanAllEngineers(tenantId)`: iterate all active `KPI_Engineer_Assignments` for period, call `computeTrend`, write a `kpi_trend_snapshots` row (PostgreSQL), update Redis key `kpi-trend:{engineerId}:{kpiDefId}:{period}` with latest level (TTL 2h).
  - `shouldAlert(engineerId, kpiDefId, period, level, redis)`: Redis key `kpi-alert:{engineerId}:{kpiDefId}:{period}:{level}` SET NX TTL 23h. Returns false if already sent today.
  - If warning level is AMBER or RED and `shouldAlert` passes: queue `KPI_WARNING` notification job (engineer in-app SSE; add to team lead daily digest list in Redis sorted set).

- [ ] `B-SI-4` — **BullMQ jobs** (`workers/jobs/src/`):
  - `sla-predictor.worker.ts`: new worker consuming `sla-predictor` queue. Repeatable cron job `*/5 * * * *` (every 5 min). Per-tenant: calls `SlaPredictor.scanAndUpdate` via HTTP to API or directly imports service. Pattern: **direct import** of `SlaPredictor` logic (no HTTP round-trip — duplicate the pure scan logic in the worker). Idempotent: running twice produces the same result.
  - `kpi-trend.worker.ts`: new worker consuming `kpi-trend` queue. Repeatable cron job `0 */30 * * * *` (every 30 min). Calls `KpiTrendAnalyser.scanAllEngineers` logic (same pattern — duplicate pure logic). Idempotent.
  - `digest.worker.ts`: repeatable cron `0 8 * * *` (08:00 daily). Reads team lead digest Redis sorted set, compiles KPI warning summary email per team lead, clears the set. Uses existing nodemailer transport from `notifications.worker.ts`.
  - Register all three workers in `workers/jobs/src/index.ts` with graceful shutdown.
  - All BullMQ jobs must be idempotent. Add `jobId` based on `tenantId + date + queue` to prevent duplicate scheduling on worker restart.

- [ ] `B-SI-5` — **tRPC analytics procedures** — add to `apps/api/src/trpc/router.ts`:
  - `analytics.slaWarnings`: returns `{ ticketId, title, priority, slaDeadline, warningLevel, assigneeName, teamName }[]` filtered by `warningLevel IN ('AMBER','RED')` for the tenant. Requires TEAM_LEAD+ role.
  - `analytics.kpiTrends`: returns latest `kpi_trend_snapshots` rows per engineer per kpi_def for the current period (from PostgreSQL). Fields: `{ engineerId, engineerName, kpiDefId, kpiName, actualToDate, projectedEop, target, warningLevel }`. Requires TEAM_LEAD+ role.
  - `analytics.myKpiTrends`: same as `kpiTrends` but scoped to `req.user.userId`. Requires ENGINEER+ role.
  - Export all new types to `packages/types/src/trpc.ts`.

- [ ] `B-SI-6` — **Notification types** — add to `notifications.service.ts`:
  - `queueSlaWarning(payload: SlaWarningPayload)`: adds job to `notifications` queue with type `SLA_WARNING`.
  - `queueKpiWarning(payload: KpiWarningPayload)`: adds job to `notifications` queue with type `KPI_WARNING` (in-app SSE only).
  - Update `notifications.worker.ts` to handle `SLA_WARNING` (email to assignee + lead) and `KPI_WARNING` (SSE event push to engineer's SSE stream).
  - `SlaWarningPayload`: `{ tenantId, ticketId, ticketRef, ticketTitle, assigneeEmail, leadEmail, warningLevel, slaDeadline, minutesRemaining }`.
  - `KpiWarningPayload`: `{ tenantId, engineerId, engineerName, kpiName, projectedScore, target, warningLevel, periodKey }`.

---

### Frontend Dev Agent Jobs

- [ ] `F-SI-1` — **KPI dashboard trend data hook** (`apps/web/app/(app)/kpis/page.tsx` + hooks):
  - Add `trpc['analytics.myKpiTrends'].useQuery()` to the KPI dashboard page (Engineer view).
  - Add `trpc['analytics.kpiTrends'].useQuery()` for TEAM_LEAD+ view.
  - Data shape available for F-SI-2 sparklines and F-SI-3 flags.

- [ ] `F-SI-2` — **KPI sparklines** (`components/kpis/kpi-trend-sparkline.tsx`):
  - New component: Tremor `Sparkline` (or `AreaChart` mini) showing `actualToDate` progress over time.
  - Props: `snapshots: { snapshotAt: string; actualToDate: number }[]`, `target: number`, `direction: 'HIGHER' | 'LOWER'`.
  - Render inside each KPI metric row in the KPI dashboard. Width: ~80px inline. No axes — just the line + target marker.
  - Show a loading skeleton while data is fetching.

- [ ] `F-SI-3` — **KPI warning flag pills** (`components/kpis/kpi-warning-badge.tsx`):
  - New component: pill badge with amber/red colouring.
  - `AMBER`: `bg-amber-100 text-amber-800` (light mode), `bg-amber-900 text-amber-200` (dark).
  - `RED`: `bg-red-100 text-red-800` (light), `bg-red-900 text-red-200` (dark).
  - Props: `level: 'NONE' | 'AMBER' | 'RED'`. Returns `null` for `NONE`.
  - Mount next to each metric name in the KPI dashboard metric rows and in the KPI agreement metrics table (read-only view).

- [ ] `F-SI-4` — **SLA warning badges in ticket list** (`components/tickets/tickets-table.tsx`):
  - Add `slaWarningLevel` to the column data from `trpc['tickets.list']`.
  - Amber/red row highlight: if `slaWarningLevel === 'RED'` apply `bg-red-50 dark:bg-red-950` row class; `AMBER` → `bg-amber-50 dark:bg-amber-950`.
  - SLA countdown badge (`sla-badge.tsx`) already turns red/amber by time — keep that logic. Add a `⚠` icon prefix to the SLA cell when `slaWarningLevel` is set and level is RED, to distinguish "system-predicted breach" from "countdown approaching".

- [ ] `F-SI-5` — **SLA warning summary on main dashboard** (`apps/web/app/(app)/dashboard/page.tsx`):
  - In the queue health section, add a "SLA at Risk" stat card: count of AMBER + count of RED tickets for the tenant.
  - Wired to `trpc['analytics.slaWarnings'].useQuery()` (TEAM_LEAD+ only, rendered conditionally by role).
  - Card: two counters side by side — `{ amberCount } Amber` / `{ redCount } Red`. Clicking either deep-links to `/tickets?slaWarning=amber` or `/tickets?slaWarning=red` (filter applied via URL param).
  - Add `slaWarning` as an optional query param to `trpc['tickets.list']` → map to `WHERE sla_warning_level = ?` in `TicketsService`.

---

### QA Checks (Sprint 18)

**SLA Prediction**
- [ ] Ticket with `assigned_at = 2h ago`, `sla_deadline = 2h from now` (50% consumed) → `slaWarningLevel = NONE`
- [ ] Ticket with `assigned_at = 7h ago`, `sla_deadline = 1h from now` (87.5% consumed) → `slaWarningLevel = AMBER`
- [ ] Ticket with `assigned_at = 9h ago`, `sla_deadline = 30min from now` (94.7% consumed) → `slaWarningLevel = RED`
- [ ] SLA warning alert not re-fired within same threshold window (Redis dedup key present)
- [ ] `sla-predictor` BullMQ job runs every 5 min — confirm with `pm2 logs lotris-workers`
- [ ] Running predictor twice in a row produces identical DB state (idempotent)
- [ ] `analytics.slaWarnings` requires TEAM_LEAD or above — ENGINEER role returns 403
- [ ] Ticket in RESOLVED/CLOSED state → `slaWarningLevel` set to `NONE` on next scan

**KPI Trends**
- [ ] `KPI_Actuals` with 3 data points, trajectory heading below target → snapshot written with `RED` or `AMBER` level
- [ ] `KPI_Actuals` with trajectory above target → snapshot written with `NONE` level
- [ ] `kpi-trend` BullMQ job runs every 30 min — confirm with `pm2 logs lotris-workers`
- [ ] KPI direction `LOWER_IS_BETTER`: projection below target (good) → `NONE`; projection above target → `AMBER/RED`
- [ ] `analytics.myKpiTrends` returns only current engineer's trends — no other engineer's data
- [ ] KPI digest email enqueued at 08:00 daily for team leads with outstanding warnings

**UI**
- [ ] Amber row highlight visible in ticket list for AMBER ticket (light + dark mode)
- [ ] Red row highlight visible in ticket list for RED ticket (light + dark mode)
- [ ] `⚠` icon prefix visible on SLA badge cell for RED tickets
- [ ] SLA at Risk dashboard card shows correct amber/red counts
- [ ] Clicking "Amber" count in dashboard card navigates to `/tickets?slaWarning=amber` with correct filter applied
- [ ] KPI sparkline renders without errors when `snapshots` array is empty (shows flat line or skeleton)
- [ ] KPI warning flag pills render amber/red in both light and dark mode
- [ ] All new UI tested at 1280px, 768px, 375px

---

### Known Issues / Env Requirements
- No new env vars required for core prediction (uses existing MSSQL + PostgreSQL + Redis connections).
- `KPI_ACTUALS` must have at least 2 data points in the current period for trend projection to be meaningful. Trend service returns `null` projection with `NONE` level if fewer than 2 actuals.
- `sla_deadline` and `assigned_at` must be non-null on a ticket for SLA prediction to run (ASSIGNED/IN_PROGRESS states always have these set by the Queue Engine).

---

## Sprint 19 · Phase 2 — Automated Reports + Workload Rebalancing

**Target milestone:** M12  
**Status:** ✅ COMPLETE  
**Branch:** `feature/sprint-19-reports-workload` → merged `dev` @ `ca32cff` · tag `v0.19.0`  
**Phase:** 2 — Intelligence

### Goal

Two parallel workstreams completing Phase 2:

1. **Automated Quarterly Report Generation & Distribution** — Wire the existing `ReportsModule` (PDF/Excel services, REST controller, PG schemas) into a BullMQ scheduled worker. Add `next_run_at` / `last_run_at` to `report_schedules`, wire tRPC procedures for the frontend, and build the Reports UI page.
2. **Engineer Workload Rebalancing Suggestions** — Compute open-ticket load per engineer vs. `Queue_Config.max_capacity_per_engineer`. Identify over/under-capacity engineers, generate reassignment suggestions, expose via tRPC, and surface in a dashboard panel with a one-click "Apply" flow.

No new external dependencies. All work uses the existing stack (BullMQ, ExcelJS, PDFKit, MSSQL, PostgreSQL, tRPC, Nodemailer).

---

### What Already Exists (Do Not Rebuild)

| Item | Location | Status |
|------|----------|--------|
| `ReportsPdfService` — all 4 report types | `apps/api/src/modules/reports/reports-pdf.service.ts` | ✅ Complete |
| `ReportsExcelService` — all 4 report types | `apps/api/src/modules/reports/reports-excel.service.ts` | ✅ Complete |
| `ReportsService` — generate + list + schedule CRUD | `apps/api/src/modules/reports/reports.service.ts` | ✅ Complete |
| `ReportsController` — REST at `/api/v1/reports` | `apps/api/src/modules/reports/reports.controller.ts` | ✅ Complete |
| `ReportsModule` — wired into `AppModule` | `apps/api/src/modules/reports/reports.module.ts` | ✅ Complete |
| Drizzle PG schemas: `reportJobs`, `reportSchedules` | `packages/db/src/schemas/postgres/reports.ts` | ✅ Exists (missing `next_run_at`, `last_run_at`) |
| `GenerateReportDto`, `CreateScheduleDto` | `apps/api/src/modules/reports/dto/index.ts` | ✅ Complete |
| `Queue_Config.max_capacity_per_engineer` | MSSQL `Queue_Config` table | ✅ Exists |

---

### Design Decisions

- **Report delivery**: Generated file stored in `os.tmpdir()` (dev) or configurable `REPORT_OUTPUT_DIR` env var (prod). Email the file as an attachment to `recipients` list. Attachment size limit: 10 MB — fall back to a download link in the email body if exceeded.
- **Schedule timing**: `next_run_at` is computed at creation and advanced on each run. WEEKLY = next Monday 08:00 UTC; MONTHLY = 1st of next month 08:00 UTC; QUARTERLY = 1st of next quarter (Jan, Apr, Jul, Oct) 08:00 UTC.
- **Report worker**: A new `report-gen.worker.ts` in `workers/jobs/src/`. Hourly cron `0 * * * *` triggers `PROCESS_SCHEDULES` job — one job per tenant (keyed `report-schedule-check:{tenantId}:{YYYYMMDDHH}` to prevent double-runs). Per-schedule `GENERATE_REPORT` job keyed `report-gen:{scheduleId}:{nextRunAt}`.
- **Workload imbalance threshold**: a team is "imbalanced" if ≥1 engineer is at >100% capacity AND ≥1 engineer is at <70% capacity simultaneously.
- **Suggestion algorithm**: For each over-capacity engineer, take their lowest-priority open ticket(s) (sorted: priority ASC, assigned_at ASC) and suggest reassignment to the least-loaded under-capacity engineer in the same team. Max 5 suggestions per team. Never suggest reassignment of ESCALATED tickets.
- **Batch reassign cap**: Max 20 reassignments per `tickets.batchReassign` call. Uses existing `TicketsService` assign logic (respects state machine, fires notifications, writes audit log).
- **No new DB tables for workload**: suggestions are computed in-memory at query time — no persistence needed.
- **tRPC namespace**: report procedures at `'reports.*'`; workload at `'analytics.teamWorkload'` + `'analytics.workloadSuggestions'`.
- **Role gates**: all report and workload procedures require `kpiAgreementProcedure` (TEAM_LEAD, IT_MANAGER, ADMIN, SUPERADMIN).

---

### Inter-Agent Dependencies

```
B-AR-1 (DB migration + Drizzle schema update) must complete before B-AR-2 and B-AR-3.
B-AR-4 (tRPC report procedures) depends on B-AR-2 (ReportsService next_run_at logic).
B-AR-7 (report_config schema + ReportsConfigService) is independent — can run in parallel with B-AR-2/3.
B-AR-7 must complete before B-AR-3 (worker reads config) and before B-AR-4 (tRPC config procedures).
B-AR-5 (WorkloadAnalyser) is independent — can run in parallel with all report jobs.
B-AR-6 (tRPC workload procedures) depends on B-AR-5.
F-AR-1 (Reports UI) depends on B-AR-4 (tRPC procedures wired).
F-AR-4 (Report Settings panel) depends on B-AR-7 (tRPC config procedures).
F-AR-2 and F-AR-3 (Workload panel) depend on B-AR-6.
```

---

### Backend Dev Agent Jobs

- [ ] `B-AR-1` — **DB migration `0009_report_schedule_timing.sql`** (PostgreSQL):
  ```sql
  -- PostgreSQL: add scheduling columns to report_schedules
  ALTER TABLE report_schedules
    ADD COLUMN next_run_at  TIMESTAMPTZ,
    ADD COLUMN last_run_at  TIMESTAMPTZ;

  CREATE INDEX ON report_schedules (tenant_id, next_run_at) WHERE is_active = 'true';
  ```
  Update Drizzle PG schema `packages/db/src/schemas/postgres/reports.ts`:
  - Add `nextRunAt: timestamp('next_run_at', { withTimezone: true })` and `lastRunAt: timestamp('last_run_at', { withTimezone: true })` fields to `reportSchedules`.
  - Migration file goes in `packages/db/migrations/pg/0003_report_schedule_timing.sql`.

- [ ] `B-AR-2` — **`ReportsService` extension** — update `createSchedule()` + add schedule execution logic. In `apps/api/src/modules/reports/reports.service.ts`:
  - Add private `computeNextRunAt(frequency: string): Date`:
    - `'WEEKLY'` → next Monday at 08:00 UTC.
    - `'MONTHLY'` → 1st of next month at 08:00 UTC.
    - `'QUARTERLY'` → 1st of next quarter (Jan/Apr/Jul/Oct) at 08:00 UTC.
  - Update `createSchedule()` to call `computeNextRunAt(dto.frequency)` and include `nextRunAt` in the insert.
  - Add `processDueSchedules(tenantId: string)`: SELECT `reportSchedules` WHERE `tenantId = ?` AND `nextRunAt <= NOW()` AND `isActive = 'true'`. For each: create a `reportJobs` row, advance `nextRunAt = computeNextRunAt(schedule.frequency)`, update `lastRunAt = NOW()`. Returns `{ scheduled: string[] }` (jobIds).
  - Add `emailReportToRecipients(jobId: string, filePath: string, recipients: string[])`: sends email via nodemailer with the file as an attachment (if ≤10 MB) or a download link.
  - `ReportsModule` does not need to change (already exports `ReportsService`).

- [ ] `B-AR-3` — **`report-gen.worker.ts`** (`workers/jobs/src/report-gen.worker.ts`):
  - New BullMQ worker consuming queue `'report-gen'`, concurrency 2.
  - Job types dispatched by `name` field:
    - **`'PROCESS_SCHEDULES'`** — triggered by hourly cron `0 * * * *`. Fetches all distinct `tenant_id` values from `report_schedules WHERE is_active = 'true'` (PostgreSQL query in worker). For each tenant, calls the equivalent of `processDueSchedules(tenantId)` inline (no HTTP — duplicate the query + logic directly in the worker). Idempotent via job key `report-schedule-check:{tenantId}:{YYYYMMDDHH}`.
    - **`'GENERATE_REPORT'`** — triggered per due schedule. Payload: `{ jobId, tenantId, reportType, format, dateFrom, dateTo, teamId, recipients }`. Calls `ReportsPdfService.generate()` or `ReportsExcelService.generate()` directly (import the service class — instantiate with `new` since workers don't have NestJS DI). On success: update `reportJobs` row to `DONE` with `filePath`. Email to recipients via nodemailer (same transport as `notifications.worker.ts`). On failure: set `FAILED` + `errorMsg`.
  - Register hourly `PROCESS_SCHEDULES` repeatable job in `workers/jobs/src/index.ts`. Add `reportGenQueue` and `reportGenWorker` to graceful shutdown.

- [ ] `B-AR-4` — **tRPC report procedures** — add to `apps/api/src/trpc/router.ts`. Import `ReportsService` from the NestJS context (pass via `ctx.reportsService` or inject via `createContext` — follow the same pattern used for existing services). Add:
  - `'reports.list'`: `kpiAgreementProcedure.query()` — returns `ReportJob[]` for tenant (last 50, ordered by `createdAt DESC`).
  - `'reports.generate'`: `kpiAgreementProcedure.input(z.object({ reportType: z.enum(['TICKET_SUMMARY','SLA_COMPLIANCE','KPI_REPORT','ENGINEER_PERF']), format: z.enum(['PDF','EXCEL']), dateFrom: z.string().optional(), dateTo: z.string().optional(), teamId: z.string().uuid().optional() })).mutation()` — calls `reportsService.generateReport()`, returns `{ jobId: string }`.
  - `'reports.jobStatus'`: `kpiAgreementProcedure.input(z.object({ jobId: z.string().uuid() })).query()` — returns single `ReportJob`.
  - `'reports.schedules.list'`: `kpiAgreementProcedure.query()` — returns `ReportSchedule[]`.
  - `'reports.schedules.create'`: `kpiAgreementProcedure.input(z.object({ reportType: z.enum([...]), format: z.enum(['PDF','EXCEL']), frequency: z.enum(['WEEKLY','MONTHLY','QUARTERLY']), recipients: z.string().min(2), teamId: z.string().uuid().optional() })).mutation()` — calls `reportsService.createSchedule()`.
  - `'reports.schedules.delete'`: `kpiAgreementProcedure.input(z.object({ id: z.string().uuid() })).mutation()` — calls `reportsService.deleteSchedule()`.

- [ ] `B-AR-5` — **`WorkloadAnalyser` service** (`apps/api/src/modules/analytics/workload-analyser.service.ts`):
  - `@Injectable() WorkloadAnalyser`
  - `analyseTeam(tenantId: string, teamId: string): Promise<TeamWorkloadResult>`:
    - Fetch `Queue_Config` for `teamId`; fall back to tenant-default row (`teamId IS NULL`) if none found. Use `maxCapacityPerEngineer`.
    - MSSQL query: SELECT `u.id`, `u.full_name`, COUNT(t.id) AS `openCount` FROM `Users u` LEFT JOIN `Tickets t` ON `t.assignee_id = u.id` AND `t.status IN ('ASSIGNED','IN_PROGRESS','ESCALATED')` AND `t.tenant_id = :tenantId` WHERE `u.team_id = :teamId` AND `u.tenant_id = :tenantId` GROUP BY `u.id, u.full_name`.
    - Compute `loadPct = Math.round((openCount / maxCapacityPerEngineer) * 100)`.
    - Identify over-capacity (`loadPct > 100`) and under-capacity (`loadPct < 70`) engineers.
    - Build suggestions (max 5 per team): for each over-capacity engineer fetch their lowest-priority non-ESCALATED open tickets (ORDER BY priority ASC, assigned_at ASC LIMIT 3 per engineer). Suggest each to the least-loaded under-capacity engineer.
    - Returns `{ teamId, teamName, capacity: number, engineers: EngineerLoad[], suggestions: WorkloadSuggestion[] }`.
  - `analyseAllTeams(tenantId: string)`: SELECT distinct `team_id` from `Users WHERE tenant_id = :tenantId AND team_id IS NOT NULL`. Call `analyseTeam` for each. Return array.
  - Every MSSQL query includes `tenantId` filter. No cross-tenant reads.
  - Add `WorkloadAnalyser` to `analytics.module.ts` providers.
  - Export new types `EngineerLoad`, `WorkloadSuggestion`, `TeamWorkloadResult` from `packages/types/src/context.ts` and `packages/types/src/index.ts`.

- [ ] `B-AR-6` — **tRPC workload procedures** — add to `apps/api/src/trpc/router.ts`:
  - `'analytics.teamWorkload'`: `kpiAgreementProcedure.input(z.object({ teamId: z.string().uuid() })).query()` — calls `workloadAnalyser.analyseTeam(tenantId, teamId)`. Returns `TeamWorkloadResult`.
  - `'analytics.workloadSuggestions'`: `kpiAgreementProcedure.query()` — calls `workloadAnalyser.analyseAllTeams(tenantId)`. Returns `TeamWorkloadResult[]`.
  - `'tickets.batchReassign'`: `kpiAgreementProcedure.input(z.object({ reassignments: z.array(z.object({ ticketId: z.string().uuid(), toEngineerId: z.string().uuid() })).min(1).max(20) })).mutation()` — iterates reassignments, calls `ticketsService.assignTicket()` for each, collects errors without aborting remaining items. Returns `{ applied: number, failed: { ticketId: string; reason: string }[] }`.

- [ ] `B-AR-7` — **Report Config** — tenant-level settings that govern report generation behaviour. All fields are optional overrides; hardcoded defaults apply when unset.
  - **DB migration** `packages/db/migrations/pg/0004_report_config.sql`:
    ```sql
    CREATE TABLE report_config (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id               VARCHAR(36) UNIQUE NOT NULL,
      brand_name              VARCHAR(120),         -- PDF header company name (default: 'Lotris')
      default_timezone        VARCHAR(60),          -- e.g. 'Africa/Lagos' (default: 'UTC')
      attachment_size_limit_mb INT,                 -- switch to download link above this (default: 10)
      retention_days          INT,                  -- 0 = never purge (default: 30)
      default_recipients      TEXT,                 -- JSON array; appended to every schedule's recipients
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
  - **Drizzle PG schema** `packages/db/src/schemas/postgres/report-config.ts` — `reportConfig` table; export `ReportConfig`, `NewReportConfig`. Add to `packages/db/src/schemas/postgres/index.ts`.
  - **`ReportsConfigService`** (`apps/api/src/modules/reports/reports-config.service.ts`):
    - `getConfig(tenantId: string): Promise<ReportConfigDefaults>` — SELECT from `report_config` WHERE `tenant_id = ?`; merge with hardcoded defaults for any null fields. Returns `{ brandName, defaultTimezone, attachmentSizeLimitMb, retentionDays, defaultRecipients: string[] }`.
    - `upsertConfig(tenantId: string, dto: UpdateReportConfigDto): Promise<void>` — INSERT … ON CONFLICT (tenant_id) DO UPDATE.
  - **`UpdateReportConfigDto`** in `apps/api/src/modules/reports/dto/index.ts`:
    - `brandName?: string` (max 120 chars)
    - `defaultTimezone?: string` (validated against a whitelist of IANA tz strings, or left as free text with a note to validate at runtime via `Intl.DateTimeFormat`)
    - `attachmentSizeLimitMb?: number` (min 1, max 50)
    - `retentionDays?: number` (min 0, max 365)
    - `defaultRecipients?: string` (JSON array of email strings)
  - **Wire into generation pipeline**: `ReportsPdfService.writeHeader()` and `ReportsExcelService` must call `reportsConfigService.getConfig(tenantId)` and use `brandName` in the PDF/Excel header. `computeNextRunAt()` must use `defaultTimezone` when computing MONTHLY/QUARTERLY boundaries. `emailReportToRecipients()` must merge `defaultRecipients` with the schedule's own recipients list. Attachment size check uses `attachmentSizeLimitMb`.
  - **Wire into `report-gen.worker.ts`**: worker instantiates `ReportsConfigService` directly (same pattern as PDF/Excel services — no NestJS DI).
  - **`ReportsModule`**: add `ReportsConfigService` to providers and exports.
  - **tRPC procedures** — add to `apps/api/src/trpc/router.ts`:
    - `'reports.config.get'`: `kpiAgreementProcedure.query()` — returns `ReportConfigDefaults` for the tenant. Accessible to TEAM_LEAD+ (so TEAM_LEAD can read settings; only ADMIN+ can update).
    - `'reports.config.update'`: `adminProcedure.input(UpdateReportConfigDtoSchema).mutation()` — calls `reportsConfigService.upsertConfig()`. ADMIN/SUPERADMIN only.

---

### Frontend Dev Agent Jobs

- [ ] `F-AR-1` — **Reports page** (`apps/web/app/(app)/reports/page.tsx` + supporting components) based on `mockups/05-reports-v2.html`:
  - **Generate Report section**: form with `reportType` select (Ticket Summary / SLA Compliance / KPI Report / Engineer Performance), `format` radio (PDF / Excel), optional `dateFrom` + `dateTo` date inputs, optional `teamId` select (ADMIN+ only). "Generate" button calls `trpc['reports.generate'].useMutation()`. Shows spinner during generation (poll `trpc['reports.jobStatus']` every 2s until `status !== 'PROCESSING'`). On DONE: show "Download" link pointing to `GET /api/v1/reports/:id/download`. On FAILED: show error banner.
  - **Report History table**: calls `trpc['reports.list'].useQuery()`. Columns: Type, Format, Period, Status (badge), Generated At, Actions (Download button for DONE). Refresh every 10s while any row is in PROCESSING state.
  - **Scheduled Reports section**: calls `trpc['reports.schedules.list'].useQuery()`. Table: Type, Format, Frequency, Recipients, Next Run, Actions (Delete). "+ Add Schedule" button opens a drawer form — fields: reportType, format, frequency, recipients (comma-separated emails textarea), teamId (optional). Submit calls `trpc['reports.schedules.create'].useMutation()`. Delete calls `trpc['reports.schedules.delete'].useMutation()` with confirm dialog.
  - Role gate: page only accessible to TEAM_LEAD, IT_MANAGER, ADMIN, SUPERADMIN. ENGINEER sees a "Not authorised" state.
  - **Report Settings tab** (ADMIN/SUPERADMIN only — tab hidden for TEAM_LEAD/IT_MANAGER): rendered as a separate tab or collapsible section at the bottom of the Reports page. Contains the `F-AR-4` component.

- [ ] `F-AR-4` — **Report Settings panel** (`apps/web/components/reports/report-settings-panel.tsx`):
  - Reads current config via `trpc['reports.config.get'].useQuery()`. Displays current values (or defaults) for each field.
  - Inline edit form — only rendered when `role` is `ADMIN` or `SUPERADMIN`. IT_MANAGER and TEAM_LEAD see a read-only view with a "Contact your admin to change these settings" note.
  - **Fields**:
    - `brandName` — text input, placeholder `"Lotris"`. Used in PDF/Excel headers.
    - `defaultTimezone` — searchable select populated from a curated IANA timezone list (common zones + full list via `Intl.supportedValuesOf('timeZone')`). Shown as `"UTC (default)"`.
    - `attachmentSizeLimitMb` — number input (1–50). Helper text: `"Reports above this size are sent as a download link instead of an email attachment."`
    - `retentionDays` — number input (0–365). Helper text: `"0 = never delete generated files."`
    - `defaultRecipients` — textarea, one email per line (converted to JSON array on submit). Helper text: `"Added to every scheduled report automatically. Leave blank to use per-schedule recipients only."`
  - "Save Settings" button calls `trpc['reports.config.update'].useMutation()`. On success: toast `"Report settings saved."`. On error: inline field-level validation messages.
  - Invalidates `reports.config.get` on success so the read-only view updates immediately.

- [ ] `F-AR-2` — **Workload panel** (`apps/web/components/dashboard/workload-panel.tsx`):
  - Visible on the main dashboard (`02-dashboard-v2.html` "Queue Health" section), TEAM_LEAD+ only.
  - For TEAM_LEAD role: uses `trpc['analytics.teamWorkload'].useQuery({ teamId: ctx.teamId })` — shows their own team only.
  - For IT_MANAGER, ADMIN, SUPERADMIN: uses `trpc['analytics.workloadSuggestions'].useQuery()` — shows all teams.
  - **Engineer load bars**: horizontal progress bar per engineer. Green ≤69%, amber 70–99%, red ≥100%. Label: `"Kwame A. — 8/10 (80%)"`. Click engineer row to jump to their tickets.
  - **Suggestions section**: collapsible (collapsed by default if no RED engineers). Title: "Rebalancing Suggestions ({N})". List of suggestion rows: `"Move TKT-XXXX (P{priority}) from [Name] → [Name]"`. "Apply All" button at bottom of list.

- [ ] `F-AR-3` — **Apply rebalancing flow** (in `workload-panel.tsx`):
  - "Apply All" opens a confirm dialog: `"Apply {N} reassignment(s)? This will notify affected engineers."` with Cancel / Confirm buttons.
  - On confirm: calls `trpc['tickets.batchReassign'].useMutation()` with the full suggestion list mapped to `{ ticketId, toEngineerId }`.
  - Loading state: spinner on the Apply All button; panel grayed out.
  - On success: toast `"{applied} tickets reassigned successfully."`. Invalidate `analytics.teamWorkload` / `analytics.workloadSuggestions` queries so panel refreshes.
  - On partial failure: show a warning: `"{applied} reassigned; {failed.length} could not be moved."` with expandable error details.

---

### QA Checks (Sprint 19)

**Automated Reports**
- [ ] `POST /api/v1/reports/generate` returns a `jobId` and the job reaches `DONE` status for all 4 report types × 2 formats (PDF + Excel) — 8 total
- [ ] `GET /api/v1/reports/:id/download` streams the file with correct `Content-Type`
- [ ] Creating a MONTHLY schedule sets `next_run_at` to 1st of next month at 08:00 UTC
- [ ] Creating a QUARTERLY schedule sets `next_run_at` to 1st of next quarter at 08:00 UTC
- [ ] `PROCESS_SCHEDULES` job is idempotent — running twice in the same hour produces one `GENERATE_REPORT` job (dedup key present)
- [ ] Recipients receive email with attached report (or download link if >10 MB)
- [ ] `trpc['reports.generate']` mutation is blocked for ENGINEER role (403)
- [ ] `trpc['reports.schedules.list']` returns only the calling tenant's schedules
- [ ] `reportJobs` `tenantId` filter prevents cross-tenant job access

**Workload Rebalancing**
- [ ] Team with all engineers ≤69% capacity → `suggestions` array is empty
- [ ] Team with engineer at 110% capacity and another at 40% capacity → at least 1 suggestion generated
- [ ] Suggestion never includes an ESCALATED ticket
- [ ] `analyseAllTeams` includes `tenantId` filter on every MSSQL query
- [ ] `tickets.batchReassign` input of 21 items returns Zod validation error (max 20)
- [ ] `tickets.batchReassign` with invalid `toEngineerId` returns `failed` entry without aborting the rest
- [ ] Apply All triggers notifications to affected engineers (via existing `TicketsService.assignTicket` path)
- [ ] `analytics.workloadSuggestions` blocked for ENGINEER role (403)

**Report Config**
- [ ] `reports.config.get` returns defaults for a tenant with no saved config (all fields null → defaults applied)
- [ ] `reports.config.update` with `brandName = "Acme IT"` → next PDF report shows `"Acme IT — IT Help Desk Report"` in the header
- [ ] `reports.config.update` with `defaultTimezone = "Africa/Lagos"` → MONTHLY schedule `next_run_at` computed as 1st of next month at 08:00 WAT (UTC+1), not UTC
- [ ] `defaultRecipients` from config are merged (not replaced) with per-schedule recipients — no duplicate emails in merged list
- [ ] `reports.config.update` blocked for TEAM_LEAD and IT_MANAGER roles (403)
- [ ] `reports.config.get` accessible to TEAM_LEAD (read-only)
- [ ] `attachmentSizeLimitMb = 2` → a >2 MB PDF is sent as a download link, not an attachment
- [ ] `retentionDays = 0` → cleanup job skips that tenant's files

**UI**
- [ ] Reports page accessible to TEAM_LEAD; ENGINEER sees "Not authorised" state
- [ ] Report Settings tab/section visible only to ADMIN and SUPERADMIN; hidden for TEAM_LEAD and IT_MANAGER
- [ ] TEAM_LEAD on Report Settings sees read-only values with "Contact your admin" note
- [ ] Timezone select shows human-readable labels (e.g. "Africa/Lagos (WAT UTC+1)")
- [ ] Save Settings toast appears on success; field errors appear inline on validation failure
- [ ] Polling stops when all `PROCESSING` report jobs resolve
- [ ] Workload panel visible on dashboard for TEAM_LEAD, hidden for ENGINEER
- [ ] Engineer load bars show correct colour thresholds (green / amber / red)
- [ ] "Apply All" confirm dialog shows correct count
- [ ] After apply, workload panel refreshes with updated load percentages

---

### Known Issues / Env Requirements

- `REPORT_OUTPUT_DIR` — optional env var for prod. If unset, files go to `os.tmpdir()` (temp files are lost on server restart in prod; set this to a persistent volume mount).
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` — required for report email delivery. Falls back to `jsonTransport` (dev-only, no emails sent) if unset — same pattern as `notifications.worker.ts`.
- `GENERATE_REPORT` worker jobs use `new ReportsPdfService()` / `new ReportsExcelService()` / `new ReportsConfigService()` (no NestJS DI in BullMQ workers). These services only depend on `@lotris/db` helpers — no injected dependencies. Confirm this before implementation.
- `defaultTimezone` is used only for computing `next_run_at` boundaries (e.g. "1st of next month at 08:00 in the tenant's timezone"). All timestamps stored in the DB remain UTC. Use the `Temporal` API or `date-fns-tz` for timezone-aware date arithmetic — do not add a new dep; `date-fns-tz` is already in the web package; if not available in workers, use `Intl.DateTimeFormat` offset arithmetic.
- `defaultRecipients` merge: deduplicate by lowercased email address before sending. Never send the same address twice even if it appears in both the schedule list and the default list.
- `WorkloadAnalyser` is read-only (SELECT only). No tickets are modified until `tickets.batchReassign` is explicitly called by a TEAM_LEAD+.


---

## Sprint 20 · Onboarding Wizard

**Target milestone:** M13
**Status:** 🔵 IN PROGRESS
**Branch:** `feature/sprint-20-onboarding`
**Mockup:** `mockups/06-onboarding-v2.html`

### Goal
Guided 5-step onboarding wizard for first-time ADMIN / SUPERADMIN users. Wizard
auto-triggers on first login when the tenant has no teams. Progress persists via
localStorage so the admin can save & exit then resume later. Invites are
non-blocking (fire-and-forget). Completing Step 5 marks `onboardingCompletedAt`
on the tenant record.

### Design Decisions
- Wizard lives at `/onboarding` inside a dedicated `(onboarding)` route group
  (no AppShell — full-screen isolated layout matching the mockup)
- Auto-redirect: `OnboardingGuard` client component in `(app)/layout.tsx` calls
  `onboarding.getStatus`; if `PENDING` and role is ADMIN+, redirects to
  `/onboarding`
- Team Leads are selected from existing users via `users.list`; selecting - Team Leads are selected from existing users via `users.list`; selecting - Team Le`
- Invites use existing `admin.users.creat- Invites use existing `e - Invites use existing `admint; invite status is derived from `users.isActive`
- SLA step writes tenant-level SLA defaults (teamId = NULL) to `SLA_Configs`;
  pickupSlaMinutes mapped from "First Response" field, resolutionSlaMinutes from
  "Resolution" field (Critical priority values used as tenant default)
- KPI template creates a batch of KPI definitions from a preset list; templates:
  'response_resolution' | 'csat' | 'balanced' | 'custom'
- `onboardingCompletedAt` on Tenants — single nullable DATETIME2 column; NULL =
  not yet completed

### Backend Dev Agent Jobs
- [x] `B-OB-1` — SQL migration `0009_onboarding_state.sql`
- [x] `B-OB-2` — Drizzle schema: add `onboardingCompletedAt` to `tenants.ts`
- [x] `B-OB-3` — tRPC procedures: `onboarding.getStatus`, `onboarding.saveOrg`,
      `onboarding.saveSla`, `onboarding.setKpiTemplate`, `onboarding.complete`

### Frontend Dev Agent Jobs
- [x] `F-OB-1` — `apps/web/app/(onboarding)/layout.tsx` — Providers-only layout
- [x] `F-OB-2` — `apps/web/app/(onboarding)/onboarding/page.tsx`
- [x] `F-OB-3` — `apps/web/components/onboarding/onboarding-wizard.tsx`
- [x] `F-OB-4` — Step components: step-1-org, step-2-teams, step-3-invite,
      step-4-sla, step-5-kpi, step-done
- [x] `F-OB-5` — `apps/web/components/onboarding/onboarding-guard.tsx`
- [x] `F-OB- [x] `F-OB- [x] `F-OB- [x] `F-OB- [x] `F-OB- [x] `F-OB- [x] `F-OB- [x] `F-OB- cks
- [ ] `/onboarding` renders wizard without AppShell (no sidebar/topbar)
- [ ] ENGINEER navigating to `/onboarding` is blocked (redirected- [ ] ENGINEER nav ] `onboarding.getStatus` returns PENDING for a tenant with 0 teams
- [ ] `onboarding.getSt- [ ] `onboarding.getSt- [ ] `onboarding.getSt- [ ] `onboarding.getSt- [ ] team- [ ] `onboarding.getSt- [ ] `onboarding.getSt- [ ] `onboarding.getSt- [ ] `on non- [ ] `onboarding.getSt- [ ] `onboarding.getSt- [ ] `onboarding.getSt- [ ] `oser- [ ] `onboarding.getSt-ig (teamId = null)
- [ ] `onboarding.setKpiTemplate` bulk-creates KPI definitions; idemp- [ ] `onboarding.setKpiTemplate` bulk-creates KPI definitions; subsequent
      `getStatus` returns COMPLETE
- [ ] OnboardingGuard does NOT redirect ADMIN who has already completed onboarding
- [ ] localStorage key `l- [ ] localStorage key `l- [ ] localS persistence
