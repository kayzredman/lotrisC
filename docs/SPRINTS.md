# Lotris — Sprint Tracker

> Maintained by the QA Agent after every sprint. Updated after each phase gate.
> Last updated: May 2026 — Post-Sprint 5-6 (Queue Engine complete)

---

## Current Status

| Sprint | Title                        | Status        | Branch               | Gate  |
| ------ | ---------------------------- | ------------- | -------------------- | ----- |
| 1–2    | Foundation & Auth            | ✅ Complete    | `feature/sprint-1-2-auth` | M1 |
| 3–4    | Ticket Core                  | ✅ Complete    | `feature/sprint-3-4-tickets` | M2 |
| 5–6    | Queue Engine                 | ✅ Complete    | `feature/sprint-5-6-queue` | M3  |
| 7      | Task Management              | ⏳ Blocked on M3 | —                  | M4    |
| 8–10   | KPI Engine                   | ⏳ Blocked on M4 | —                  | M5    |
| 11–12  | Reporting & Full Dashboard   | ⏳ Blocked on M5 | —                  | M6    |
| 13     | System Health Monitoring     | ⏳ Blocked on M6 | —                  | M7    |

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
**Status:** BLOCKED on M3  
*(Detail to be filled by QA Agent after M3 gate)*

---

## Sprint 8–10 · KPI Engine

**Target milestone:** M5  
**Status:** BLOCKED on M4  
*(Detail to be filled by QA Agent after M4 gate)*

---

## Sprint 11–12 · Reporting & Full Dashboard

**Target milestone:** M6  
**Status:** BLOCKED on M5  
*(Detail to be filled by QA Agent after M5 gate)*

---

## Sprint 13 · System Health Monitoring

**Target milestone:** M7  
**Status:** BLOCKED on M6  
*(Detail to be filled by QA Agent after M6 gate)*

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
