# Lotris — Sprint Tracker

> Maintained by the QA Agent after every sprint. Updated after each phase gate.
> Last updated: May 2026 — Post-Sprint 15 (Dashboard QA + Tickets page full repair + Ticket assign complete; merged to `dev`)

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

## Open Issues / Deferred Items

| ID   | Item                                    | Raised     | Status   |
| ---- | --------------------------------------- | ---------- | -------- |
| OI-1 | Notifications queue: 1 failed job (DLQ) | Pre-build  | Monitor  |
| OI-2 | Native mobile app                       | Pre-build  | Deferred to post-v1 |

---

## Phase 2 / Phase 3 Backlog (post-MVP)

- SLA breach prediction + automated alerts
- KPI performance trend analysis with amber/red flags
- AI-assisted root cause classification
- Predictive KPI performance forecasting
- Natural language report summaries
- Prometheus / Grafana / Datadog monitoring integrations
