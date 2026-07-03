# Lotris API Reference

> **Status:** Active — C# backend (`src/Lotris.Api`)  
> **Contract:** OpenAPI 3.1 at [`docs/openapi/v1.json`](openapi/v1.json)  
> **Last indexed:** July 2026 (98 operations — P1 parity endpoints)

This is the **canonical human index** for the Lotris REST API. The machine-readable spec is the source of truth for request/response schemas.

---

## Quick links

| Resource | URL (local dev) |
|----------|-----------------|
| **Scalar UI** (interactive docs) | [http://localhost:5153/openapi](http://localhost:5153/openapi) |
| **OpenAPI JSON** | [http://localhost:5153/openapi/v1.json](http://localhost:5153/openapi/v1.json) |
| **Liveness** | `GET /health` |
| **Readiness** | `GET /health/ready` |
| **Hangfire dashboard** (dev only) | [http://localhost:5153/hangfire](http://localhost:5153/hangfire) |

On-prem / production: same paths on your API host. Disable the UI in hardened deployments via `OpenApi:UiEnabled: false` (see below).

---

## Authentication

Most routes require a **Lotris JWT** in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Obtain a token

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/v1/auth/login` | Public — `{ email, password }` |
| `POST` | `/api/v1/auth/register` | Public — creates tenant + admin user |

Response includes `accessToken` (JWT). Claims: `sub` (userId), `tenant_id`, role.

### Public routes (no JWT)

- `POST /api/v1/request` — public ticket intake
- `GET /api/v1/monitor/stats` — public NOC wall aggregate (all tenants in DB)
- `GET /health`, `GET /health/ready` — probes
- `GET /openapi/v1.json`, `/openapi` — API docs (when enabled)

### Role-gated areas

| Area | Typical roles |
|------|----------------|
| Admin users/teams/routing | `ADMIN`, `SUPERADMIN` |
| Analytics job config | `ADMIN`, `SUPERADMIN` |
| System health snapshot/SSE | `ADMIN`, `SUPERADMIN` |
| KPI definitions | `IT_MANAGER`, `ADMIN`, `SUPERADMIN` |
| Audit logs | `ADMIN`, `SUPERADMIN` |
| Dashboard / tickets / queue | All authenticated roles (scoped by role) |
| Workload rebalancing | `TEAM_LEAD`, `IT_MANAGER`, `ADMIN`, `SUPERADMIN` |
| Batch ticket reassignment | `TEAM_LEAD`, `IT_MANAGER`, `ADMIN`, `SUPERADMIN` |

Exact enforcement is in controller `[AuthorizeRoles(...)]` attributes and application services.

---

## SSE streams

| Stream | Path | Purpose |
|--------|------|---------|
| Notifications | `GET /api/v1/notifications/sse` | In-app notification events |
| System health | `GET /health/sse` | Live health snapshot (1s interval, ADMIN) |

Send `Authorization: Bearer {token}` and `Accept: text/event-stream`.

---

## Configuration

`appsettings.json` → `OpenApi` section:

```json
{
  "OpenApi": {
    "Enabled": true,
    "UiEnabled": true
  }
}
```

| Setting | Effect |
|---------|--------|
| `Enabled: false` | Hides `/openapi/v1.json` and Scalar UI |
| `UiEnabled: false` | Keeps JSON spec, hides Scalar UI (recommended for public cloud edge) |

OpenAPI is **disabled in the `Testing` environment** (integration tests).

---

## Frontend TypeScript types

Generated from the committed spec:

```bash
pnpm --filter @lotris/web api:codegen
```

Output: `apps/web/lib/api/generated/schema.d.ts` — use with `openapi-fetch` or manual typing.

---

## Refreshing docs after API changes

1. Run the API locally (`dotnet run --project src/Lotris.Api`)
2. Export spec: `./scripts/export-openapi.sh`
3. Regenerate index: `python3 scripts/generate-api-docs.py`
4. Regenerate TS types: `pnpm --filter @lotris/web api:codegen`

Or one shot from repo root: `pnpm api:sync`

---

## Endpoint index

<!-- API_ENDPOINTS:START -->

_Auto-generated from `docs/openapi/v1.json` — **98 operations** across **78 paths**._

### Admin (14)

- `GET /api/v1/admin/category-routing`
- `PUT /api/v1/admin/category-routing`
- `DELETE /api/v1/admin/category-routing/{id}`
- `GET /api/v1/admin/team-access`
- `POST /api/v1/admin/team-access`
- `DELETE /api/v1/admin/team-access/{id}`
- `GET /api/v1/admin/teams`
- `POST /api/v1/admin/teams`
- `PATCH /api/v1/admin/teams/{id}`
- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `PATCH /api/v1/admin/users/{id}`
- `DELETE /api/v1/admin/users/{id}`
- `PATCH /api/v1/admin/users/{id}/role`

### Analytics (4)

- `GET /api/v1/analytics/kpi-trends`
- `GET /api/v1/analytics/my-kpi-trends`
- `GET /api/v1/analytics/sla-warnings`
- `GET /api/v1/analytics/team-workload`

### AnalyticsJobs (4)

- `GET /api/v1/admin/analytics-jobs/config`
- `PATCH /api/v1/admin/analytics-jobs/config`
- `GET /api/v1/admin/analytics-jobs/status`
- `POST /api/v1/admin/analytics-jobs/{jobKey}/run-now`

### AuditLogs (1)

- `GET /api/v1/audit-logs`

### Auth (2)

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`

### Dashboard (5)

- `GET /api/v1/dashboard/engineer-perf`
- `GET /api/v1/dashboard/queue-health`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/team-workload`
- `GET /api/v1/dashboard/ticket-analytics`

### Health (6)

- `GET /health`
- `GET /health/incidents`
- `GET /health/ready`
- `POST /health/restart/{serviceName}`
- `GET /health/snapshot`
- `GET /health/sse`

### Intake (1)

- `POST /api/v1/request`

### Kpi (21)

- `GET /api/v1/kpi/actuals`
- `POST /api/v1/kpi/actuals`
- `GET /api/v1/kpi/agreements`
- `POST /api/v1/kpi/agreements`
- `GET /api/v1/kpi/agreements/{id}`
- `POST /api/v1/kpi/agreements/{id}/accept`
- `PATCH /api/v1/kpi/agreements/{id}/areas`
- `POST /api/v1/kpi/agreements/{id}/import`
- `GET /api/v1/kpi/agreements/{id}/result`
- `POST /api/v1/kpi/agreements/{id}/score`
- `POST /api/v1/kpi/agreements/{id}/submit`
- `POST /api/v1/kpi/agreements/{id}/upload`
- `GET /api/v1/kpi/assignments`
- `POST /api/v1/kpi/assignments`
- `GET /api/v1/kpi/definitions`
- `POST /api/v1/kpi/definitions`
- `GET /api/v1/kpi/definitions/{id}`
- `PATCH /api/v1/kpi/definitions/{id}`
- `DELETE /api/v1/kpi/definitions/{id}`
- `GET /api/v1/kpi/definitions/{id}/team-targets`
- `PATCH /api/v1/kpi/definitions/{id}/team-targets`

### Monitor (1)

- `GET /api/v1/monitor/stats`

### Notifications (1)

- `GET /api/v1/notifications/sse`

### Onboarding (5)

- `POST /api/v1/onboarding/complete`
- `POST /api/v1/onboarding/kpi-template`
- `POST /api/v1/onboarding/org`
- `POST /api/v1/onboarding/sla`
- `GET /api/v1/onboarding/status`

### Queue (5)

- `GET /api/v1/queue`
- `POST /api/v1/queue/claim/{ticketId}`
- `GET /api/v1/queue/config`
- `PATCH /api/v1/queue/config`
- `GET /api/v1/queue/health`

### Reports (9)

- `GET /api/v1/reports`
- `GET /api/v1/reports/config`
- `PATCH /api/v1/reports/config`
- `POST /api/v1/reports/generate`
- `GET /api/v1/reports/schedules`
- `POST /api/v1/reports/schedules`
- `DELETE /api/v1/reports/schedules/{id}`
- `GET /api/v1/reports/{id}/download`
- `GET /api/v1/reports/{id}/status`

### Tasks (9)

- `POST /api/v1/tasks`
- `GET /api/v1/tasks`
- `GET /api/v1/tasks/{id}`
- `PATCH /api/v1/tasks/{id}`
- `POST /api/v1/tasks/{id}/assignees`
- `POST /api/v1/tasks/{id}/checklist`
- `DELETE /api/v1/tasks/{id}/checklist/{itemId}`
- `PATCH /api/v1/tasks/{id}/checklist/{itemId}/toggle`
- `POST /api/v1/tasks/{id}/complete`

### Tickets (9)

- `POST /api/v1/tickets`
- `GET /api/v1/tickets`
- `POST /api/v1/tickets/batch-reassign`
- `GET /api/v1/tickets/{id}`
- `POST /api/v1/tickets/{id}/attachments`
- `POST /api/v1/tickets/{id}/comments`
- `GET /api/v1/tickets/{id}/comments`
- `GET /api/v1/tickets/{id}/history`
- `PATCH /api/v1/tickets/{id}/status`

### Users (1)

- `GET /api/v1/users/me`

<!-- API_ENDPOINTS:END -->

---

## Related docs

- [REFACTOR.md](REFACTOR.md) — migration phases (Phase 5 API documentation deliverables)
- [DATABASE-STRATEGY.md](DATABASE-STRATEGY.md) — analytics job admin endpoints
- [ONBOARDING-REFACTOR.md](ONBOARDING-REFACTOR.md) — onboarding wizard API
- [src/README.md](../src/README.md) — running the C# API locally

---

_Lotris API — OpenAPI contract is the merge gate for frontend/backend changes._
