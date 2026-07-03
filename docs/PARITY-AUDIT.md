# Lotris — tRPC → REST Parity Audit (Phase 7)

> **Generated:** July 2026 · **Last updated:** July 2026 (P1 parity shipped)  
> **Branch:** `dev`  
> **Legacy:** 77 NestJS tRPC procedures (`apps/api/src/trpc/router.ts`)  
> **Target:** C# REST (`src/Lotris.Api/Controllers/*`) + OpenAPI  
> **Status board:** [`mockups/lotris-status-phase7.html`](../mockups/lotris-status-phase7.html)

---

## Summary

| Metric | Count |
|--------|------:|
| tRPC procedures | **77** |
| C# controller groups | **17** |
| REST endpoints (OpenAPI) | **98 ops / 78 paths** |
| **Parity: covered** | **~74** |
| **Parity: partial** | **~2** |
| **Parity: gap** | **~1** (dev-only) |

The frontend **Phase 5 migration** calls REST for all main app surfaces. P1 gaps (batch reassign, public monitor, workload analyser) are **implemented and wired** in July 2026.

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
| `tickets.batchReassign` | `POST /api/v1/tickets/batch-reassign` |
| `queue.list/claim/health` | `GET /api/v1/queue`, `POST …/claim/{id}`, `GET …/health` |
| `queue.config` | `GET/PATCH /api/v1/queue/config` |
| `tasks.*` | `/api/v1/tasks` full CRUD + checklist + complete |
| `kpi.definitions.*` | `/api/v1/kpi/definitions` |
| `kpi.agreements.*` | `/api/v1/kpi/agreements/*` |
| `kpi.actuals/score/results` | `/api/v1/kpi/actuals`, `…/score`, `…/result` |
| `dashboard.*` | `/api/v1/dashboard/*` (5 endpoints) |
| `monitor.stats` | `GET /api/v1/monitor/stats` (public) |
| `analytics.teamWorkload` | `GET /api/v1/analytics/team-workload?teamId=` |
| `analytics.workloadSuggestions` | Same endpoint — `suggestions[]` in response |
| `health.getSnapshot/incidents/restart` | `/health/snapshot`, `/health/incidents`, `POST /health/restart/{name}` |
| `auditLogs.list` | `GET /api/v1/audit-logs` |
| `analytics.slaWarnings` | `GET /api/v1/analytics/sla-warnings` |
| `analytics.kpiTrends/myKpiTrends` | `GET /api/v1/analytics/kpi-trends`, `…/my-kpi-trends` |
| `reports.list` | `GET /api/v1/reports` |
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

---

## ❌ Gaps (no REST equivalent yet)

| tRPC | Priority | Notes |
|------|----------|-------|
| `health.storeHealth` / `health.repairStore` | **P3** | Dev-only NestJS/pnpm feature — **drop for on-prem** (ops script docs only) |

---

## RBAC audit notes

| Area | tRPC gate | REST gate | Match? |
|------|-----------|-----------|--------|
| Admin users/teams | `adminProcedure` / `managerProcedure` | `[AuthorizeRoles(Admin, SuperAdmin)]` | ✅ |
| KPI agreements | `kpiAgreementProcedure` | Role checks in `KpiController` / service | ✅ (verify IT_MANAGER) |
| Health snapshot | `managerProcedure` | `Admin, SuperAdmin` only | ⚠️ **Stricter on REST** |
| Monitor | `publicProcedure` | `GET /api/v1/monitor/stats` (no JWT) | ✅ |
| Workload / batch reassign | `kpiAgreementProcedure` | TEAM_LEAD+ on analytics + tickets | ✅ |
| Onboarding | `adminProcedure` | `Admin, SuperAdmin` | ✅ |

**Action items:**

1. ~~Decide if `/monitor` should stay public~~ → **Done:** `GET /api/v1/monitor/stats` is public.
2. Align health snapshot RBAC (manager vs admin) if IT_MANAGER needs ops view.

---

## Phase 7 checklist linkage

| Gate item | This audit |
|-----------|------------|
| tRPC → REST parity | **~95%** — 1 dev-only gap |
| Public `/monitor` | ✅ `GET /api/v1/monitor/stats` |
| Workload rebalancing UI | ✅ analytics team-workload + batch-reassign |
| SSE notifications + health | ✅ REST exists |
| FSM / load / tenant tests | **37 dotnet tests green**; load test pending; ETL gate deferred |
| On-prem compose smoke | `pnpm onprem:smoke` / clean VM |

---

## Recommended implementation order

1. ~~**`POST /api/v1/tickets/batch-reassign`**~~ ✅  
2. ~~**`GET /api/v1/monitor/stats`**~~ ✅  
3. ~~**`GET /api/v1/analytics/team-workload`**~~ ✅ (includes suggestions)  
4. ~~**`GET /api/v1/reports`**~~ ✅ (already existed)  
5. **Drop** `health.storeHealth` / `repairStore` from product surface (keep ops script docs only)  
6. **Decommission** `apps/api` + tRPC client after smoke + integration tests green  

---

## Verification commands

```bash
# Public monitor (no auth)
curl -s http://localhost:5153/api/v1/monitor/stats | head -c 200

# REST smoke (authenticated)
pnpm smoke:phase5

# On-prem stack
pnpm onprem:smoke

# .NET integration tests
cd src && dotnet test

# OpenAPI refresh
pnpm api:sync
```

---

_Next: FSM/load/tenant test matrix, clean VM on-prem smoke, NestJS decommission._
