# Lotris — tRPC → REST Parity Audit (Phase 7)

> **Generated:** July 2026 · **Branch:** `dev`  
> **Legacy:** 77 NestJS tRPC procedures (`apps/api/src/trpc/router.ts`)  
> **Target:** C# REST (`src/Lotris.Api/Controllers/*`) + OpenAPI  
> **Status board:** [`mockups/lotris-status-phase7.html`](../mockups/lotris-status-phase7.html)

---

## Summary

| Metric | Count |
|--------|------:|
| tRPC procedures | **77** |
| C# controller groups | **16** |
| REST endpoints (approx.) | **~90** |
| **Parity: covered** | **~68** |
| **Parity: partial** | **~5** |
| **Parity: gap** | **~4** |

The frontend **Phase 5 migration** already calls REST for all main app surfaces. Remaining gaps are mostly **admin/analytics edge cases**, **NestJS-only dev tooling**, and **explicit assign/batch** helpers.

---

## ✅ Covered (representative mapping)

| tRPC | REST equivalent |
|------|-----------------|
| `users.me` | `GET /api/v1/users/me` |
| `admin.users.*` | `/api/v1/admin/users` CRUD + role |
| `admin.teams.*` | `/api/v1/admin/teams` |
| `admin.teamAccess.*` | `/api/v1/admin/team-access` |
| `admin.categoryRouting.*` | `/api/v1/admin/category-routing` |
| `tickets.list/get/create` | `GET/POST /api/v1/tickets` |
| `tickets.updateStatus` | `PATCH /api/v1/tickets/{id}/status` |
| `tickets.addComment/getComments` | `POST/GET …/comments` |
| `tickets.getHistory` | `GET …/history` |
| `queue.list/claim/health` | `GET /api/v1/queue`, `POST …/claim/{id}`, `GET …/health` |
| `queue.config` | `GET/PATCH /api/v1/queue/config` |
| `tasks.*` | `/api/v1/tasks` full CRUD + checklist + complete |
| `kpi.definitions.*` | `/api/v1/kpi/definitions` |
| `kpi.agreements.*` | `/api/v1/kpi/agreements/*` |
| `kpi.actuals/score/results` | `/api/v1/kpi/actuals`, `…/score`, `…/result` |
| `dashboard.*` | `/api/v1/dashboard/*` (5 endpoints) |
| `health.getSnapshot/incidents/restart` | `/health/snapshot`, `/health/incidents`, `POST /health/restart/{name}` |
| `auditLogs.list` | `GET /api/v1/audit-logs` |
| `analytics.slaWarnings` | `GET /api/v1/analytics/sla-warnings` |
| `analytics.kpiTrends/myKpiTrends` | `GET /api/v1/analytics/kpi-trends`, `…/my-kpi-trends` |
| `reports.generate/jobStatus/download` | `/api/v1/reports/generate`, `…/{id}/status`, `…/download` |
| `reports.schedules.*` | `/api/v1/reports/schedules` |
| `reports.config.*` | `GET/PATCH /api/v1/reports/config` |
| `onboarding.*` | `/api/v1/onboarding/*` |
| `auth (Clerk-era)` | `POST /api/v1/auth/login`, `register` |
| Analytics job admin | `/api/v1/admin/analytics-jobs/*` |
| Public intake | `POST /api/v1/request` |
| Notifications SSE | `GET /api/v1/notifications/sse` |
| Health SSE | `GET /health/sse` |

---

## ⚠️ Partial (behaviour differs or merged)

| tRPC | REST / notes |
|------|----------------|
| `tickets.assign` | Assignment via `PATCH …/status` → `Assigned` + `assigneeId` in body — **no dedicated assign endpoint** |
| `teams.list` | Use `GET /api/v1/admin/teams` (admin-scoped; same data for managers) |
| `users.list` | No generic list; `GET /api/v1/admin/users` for admins |
| `monitor.stats` | **No single public REST** — `/monitor` composes `dashboard/summary` + `dashboard/queue-health` (auth may block true public wall) |
| `analytics.teamWorkload` | Covered by `GET /api/v1/dashboard/team-workload` (different path, same intent) |

---

## ❌ Gaps (no REST equivalent yet)

| tRPC | Priority | Suggested REST |
|------|----------|----------------|
| `tickets.batchReassign` | **P1** | `POST /api/v1/tickets/batch-reassign` |
| `analytics.workloadSuggestions` | **P2** | `GET /api/v1/analytics/workload-suggestions` |
| `reports.list` | **P2** | `GET /api/v1/reports` (generated job history) |
| `health.storeHealth` / `health.repairStore` | **P3** | Dev-only NestJS/pnpm feature — **drop or reimplement** for on-prem |

---

## RBAC audit notes

| Area | tRPC gate | REST gate | Match? |
|------|-----------|-----------|--------|
| Admin users/teams | `adminProcedure` / `managerProcedure` | `[AuthorizeRoles(Admin, SuperAdmin)]` | ✅ |
| KPI agreements | `kpiAgreementProcedure` | Role checks in `KpiController` / service | ✅ (verify IT_MANAGER) |
| Health snapshot | `managerProcedure` | `Admin, SuperAdmin` only | ⚠️ **Stricter on REST** |
| Monitor | `publicProcedure` | Dashboard endpoints require JWT | ⚠️ **Monitor not truly public on C#** |
| Onboarding | `adminProcedure` | `Admin, SuperAdmin` | ✅ |

**Action items:**

1. Decide if `/monitor` should stay public → add `[AllowAnonymous]` dashboard aggregate or dedicated `GET /api/v1/monitor/stats`.
2. Align health snapshot RBAC (manager vs admin) if IT_MANAGER needs ops view.

---

## Phase 7 checklist linkage

| Gate item | This audit |
|-----------|------------|
| tRPC → REST parity | **~90%** — 4 explicit gaps above |
| Public `/monitor` | Needs decision + possibly 1 endpoint |
| SSE notifications + health | ✅ REST exists |
| FSM / load / tenant tests | Separate test pass (not procedure-count) |
| On-prem compose smoke | `pnpm onprem:smoke` / clean VM |

---

## Recommended implementation order

1. **`POST /api/v1/tickets/batch-reassign`** — wire frontend if still referenced  
2. **`GET /api/v1/monitor/stats`** — public aggregate for NOC wall (or document auth requirement)  
3. **`GET /api/v1/reports`** — list recent generated reports  
4. **`GET /api/v1/analytics/workload-suggestions`** — if dashboard still needs it  
5. **Drop** `health.storeHealth` / `repairStore` from product surface (keep ops script docs only)  
6. **Decommission** `apps/api` + tRPC client after smoke + integration tests green  

---

## Verification commands

```bash
# REST smoke (authenticated)
pnpm smoke:phase5

# On-prem stack
pnpm onprem:smoke

# .NET integration tests
cd src && dotnet test

# OpenAPI diff (manual)
pnpm api:sync && diff docs/openapi/v1.json ...
```

---

_Next: implement P1 gaps or run full RBAC integration test matrix._
