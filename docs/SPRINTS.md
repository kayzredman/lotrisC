# Lotris — Sprint Tracker

> Maintained by the QA Agent after every sprint. Updated after each phase gate.
> Last updated: May 2026 — Pre-Sprint 1

---

## Current Status

| Sprint | Title                        | Status        | Branch               | Gate  |
| ------ | ---------------------------- | ------------- | -------------------- | ----- |
| 1–2    | Foundation & Auth            | ✅ Complete    | `feature/sprint-1-2-auth` | M1 |
| 3–4    | Ticket Core                  | 🔨 In progress | `feature/sprint-3-4-tickets` | M2 |
| 5–6    | Queue Engine                 | ⏳ Blocked on M2 | —                  | M3    |
| 7      | Task Management              | ⏳ Blocked on M3 | —                  | M4    |
| 8–10   | KPI Engine                   | ⏳ Blocked on M4 | —                  | M5    |
| 11–12  | Reporting & Full Dashboard   | ⏳ Blocked on M5 | —                  | M6    |
| 13     | System Health Monitoring     | ⏳ Blocked on M6 | —                  | M7    |

---

## Sprint 1–2 · Foundation & Auth

**Target milestone:** M1  
**Status:** NOT STARTED

### Backend Dev Agent Jobs
- [ ] `B1-1` — Monorepo scaffold: `turbo.json`, `package.json` workspaces, all package stubs
- [ ] `B1-2` — Drizzle MSSQL schema: `tenants`, `users`, `roles`, `teams` (all with `tenant_id`)
- [ ] `B1-3` — MSSQL migration: `0001_initial_schema.sql`
- [ ] `B1-4` — NestJS `AuthModule`: ClerkJwtGuard, internal JWT issuance, `useTenantSession` helper
- [ ] `B1-5` — Clerk webhook handler: JIT user provisioning on `user.created` event
- [ ] `B1-6` — tRPC router stub: `users.me`, `users.list`, `teams.list`
- [ ] `B1-7` — NestJS `AdminModule`: user CRUD, team CRUD, role assignment
- [ ] `B1-8` — Export all types to `packages/types/src/trpc.ts`

### Frontend Dev Agent Jobs
- [ ] `F1-1` — Next.js 15 App Router scaffold: layouts, route groups `(auth)` and `(app)`
- [ ] `F1-2` — Tailwind + ShadCN/UI setup; port design tokens from `style-v2.css` to `tailwind.config.ts`
- [ ] `F1-3` — Sidebar component (desktop full, tablet icon rail, mobile bottom nav)
- [ ] `F1-4` — Login page — Clerk `<SignIn />` with Lotris Appearance API styling
- [ ] `F1-5` — User & Team management page (ADMIN role)
- [ ] `F1-6` — tRPC client setup in `apps/web/lib/trpc.ts`

### Dependencies
- `F1-4` depends on `B1-4` (Clerk guard must exist)
- `F1-5`, `F1-6` depend on `B1-6`, `B1-7`, `B1-8`

### QA Gate Checks — M1
- [ ] Login works end-to-end with Google social login via Clerk
- [ ] New user provisioned in MSSQL on first login (webhook fires)
- [ ] Protected routes return 401 without valid Clerk JWT
- [ ] Internal JWT contains `{ tenantId, userId, role }` — no MSSQL IDs
- [ ] Team CRUD works — data isolated per `tenantId`
- [ ] Sidebar renders correctly at 1280px, 768px, 375px

---

## Sprint 3–4 · Ticket Core

**Target milestone:** M2  
**Status:** IN PROGRESS — branch `feature/sprint-3-4-tickets`

### Backend Dev Agent Jobs
- [ ] `B3-1` — MSSQL schemas: `tickets`, `ticket_comments`, `ticket_history`, `sla_configs`, `attachment_refs`
- [ ] `B3-2` — MSSQL migration: `0002_ticket_core.sql`
- [ ] `B3-3` — Ticket lifecycle state machine: transition guards, status enum, transition writes `ticket_history` + audit log
- [ ] `B3-4` — `TicketsModule` REST v1: `POST /api/v1/tickets`, `GET /api/v1/tickets` (filtered, paginated), `GET /api/v1/tickets/:id`, `PATCH /api/v1/tickets/:id/status`
- [ ] `B3-5` — Comments API: `POST/GET /api/v1/tickets/:id/comments` (internal flag support)
- [ ] `B3-6` — Attachment refs: `POST /api/v1/tickets/:id/attachments` (stores S3 key + metadata in MSSQL; S3 upload is frontend-direct)
- [ ] `B3-7` — tRPC procedures: `tickets.list` (queue-ordered by priority + sla_deadline), `tickets.get`, `tickets.create`, `tickets.updateStatus`, `tickets.addComment`
- [ ] `B3-8` — SLA config REST: `GET/PATCH /api/v1/admin/sla-config` (per-tenant pickup + resolution SLA values, ADMIN-only)
- [ ] `B3-9` — Basic notification triggers: fire BullMQ `notifications` job on ticket created, assigned, resolved

### Frontend Dev Agent Jobs
- [ ] `F3-1` — Tickets list page (`app/(app)/tickets/page.tsx`): filterable table — status, priority, assignee, team; SLA countdown badge; pagination
- [ ] `F3-2` — Ticket detail drawer (`components/tickets/ticket-drawer.tsx`): full ticket view, status history timeline, comment thread, status action buttons per role
- [ ] `F3-3` — Create ticket modal (`components/tickets/create-ticket-modal.tsx`): title, description, priority select, team select
- [ ] `F3-4` — Ticket status action bar: role-aware action buttons (Claim, Reassign, Escalate, Resolve, Close) using `PATCH .../status`
- [ ] `F3-5` — SLA countdown component (`components/tickets/sla-badge.tsx`): live countdown from `sla_deadline`; green→amber→red colour progression
- [ ] `F3-6` — tRPC hooks wiring: `trpc.tickets.list`, `trpc.tickets.get`, `trpc.tickets.create` via `@/lib/trpc`

### Dependencies
- `F3-1` through `F3-6` depend on `B3-4`, `B3-7` being done first
- `F3-4` depends on `B3-3` (state machine) being correct
- `B3-9` depends on `B3-4` and BullMQ queue already registered in `workers/jobs` ✅

### QA Gate Checks — M2
- [ ] `POST /api/v1/tickets` creates ticket in MSSQL with correct `tenantId`, status `NEW`
- [ ] Status transitions enforce valid graph (e.g. `NEW → IN_PROGRESS` rejected; `NEW → TEAM_ASSIGNED` accepted)
- [ ] Every status change writes a `ticket_history` row + `audit_log` row
- [ ] `GET /api/v1/tickets` returns only tickets for the authenticated user's tenant
- [ ] Comment with `isInternal: true` not visible to ENGINEER role, visible to TEAM_LEAD+
- [ ] SLA countdown badge turns amber at ≤50% time remaining, red at ≤20%
- [ ] Tickets list is ordered by `priority DESC, sla_deadline ASC`
- [ ] Create ticket modal submits and new row appears in table without full page reload
- [ ] Ticket detail drawer loads all comments and history on open

---

## Sprint 5–6 · Queue Engine

**Target milestone:** M3  
**Status:** BLOCKED on M2  
*(Detail to be filled by QA Agent after M2 gate)*

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
