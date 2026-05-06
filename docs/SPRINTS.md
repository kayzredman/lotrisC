# Lotris — Sprint Tracker

> Maintained by the QA Agent after every sprint. Updated after each phase gate.
> Last updated: May 6 2026 — Sprint 1–2 kicked off on `feature/sprint-1-2-auth`

---

## Current Status

| Sprint | Title                        | Status        | Branch               | Gate  |
| ------ | ---------------------------- | ------------- | -------------------- | ----- |
| 1–2    | Foundation & Auth            | � In progress | `feature/sprint-1-2-auth` | M1 |
| 3–4    | Ticket Core                  | ⏳ Blocked on M1 | —                  | M2    |
| 5–6    | Queue Engine                 | ⏳ Blocked on M2 | —                  | M3    |
| 7      | Task Management              | ⏳ Blocked on M3 | —                  | M4    |
| 8–10   | KPI Engine                   | ⏳ Blocked on M4 | —                  | M5    |
| 11–12  | Reporting & Full Dashboard   | ⏳ Blocked on M5 | —                  | M6    |
| 13     | System Health Monitoring     | ⏳ Blocked on M6 | —                  | M7    |

---

## Sprint 1–2 · Foundation & Auth

**Target milestone:** M1  
**Status:** IN PROGRESS — branch `feature/sprint-1-2-auth`

### Backend Dev Agent Jobs
- [x] `B1-1` — Monorepo scaffold: `turbo.json`, `pnpm-workspace.yaml`, `package.json`, all package stubs
- [x] `B1-2` — Drizzle MSSQL schema: `tenants`, `users`, `roles`, `teams`, `audit_logs` (all with `tenant_id`)
- [x] `B1-3` — MSSQL migration: `0001_initial_schema.sql`
- [x] `B1-4` — NestJS `AuthModule`: `ClerkJwtGuard`, `AuthService.resolveSession`, `RoleGuard`, `@Session()` decorator
- [x] `B1-5` — Clerk webhook handler: JIT user + tenant provisioning (`user.created`, `organization.created`, `organizationMembership.created`)
- [x] `B1-6` — tRPC router: `users.me`, `users.list`, `teams.list` — all tenantId-filtered
- [x] `B1-7` — NestJS `AdminModule`: user CRUD + team CRUD + role assignment REST v1; full audit log on every mutation
- [x] `B1-8` — Shared types: `packages/types/src/context.ts` (TrpcAuth, TrpcContext, all domain enums)

### Frontend Dev Agent Jobs
- [x] `F1-1` — Next.js 15 App Router scaffold: `(auth)` + `(app)` route groups, root layout, root redirect
- [x] `F1-2` — Tailwind config with design tokens from `style-v2.css`; ShadCN base components (Button, Card, Input, Badge)
- [x] `F1-3` — Sidebar component: desktop full (240px), tablet icon rail (64px), mobile bottom nav (5 primary items)
- [x] `F1-4` — Login page with Clerk `<SignIn />` styled to Lotris dark theme
- [x] `F1-5` — User & Team management page UI (ADMIN role) — Users table + Teams table + Invite/Create modals
- [x] `F1-6` — tRPC client: `apps/web/lib/trpc.ts` + `Providers` with Clerk token injection

### Dependencies
- `F1-4` depends on `B1-4` ✅ done
- `F1-5`, `F1-6` depend on `B1-6`, `B1-7`, `B1-8` ✅ done

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
**Status:** BLOCKED on M1  
*(Detail to be filled by QA Agent after M1 gate)*

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
