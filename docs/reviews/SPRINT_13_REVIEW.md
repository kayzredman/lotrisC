# Sprint 13 Review — System Health Monitoring

**Sprint:** 13  
**Milestone:** M7  
**Status:** ✅ COMPLETE  
**Branch:** `feature/sprint-13-system-health-monitoring` → `dev`

---

## Summary

Sprint 13 delivered the SysAdmin Operations Dashboard at `/system-health` — a real-time ops view covering all 6 infrastructure services, BullMQ queue depths, incident history, and restart controls. The feature is ADMIN/SUPERADMIN gated and streams live data via SSE (Server-Sent Events) with a polling fallback.

---

## Deliverables

### Backend

| File | Description |
|------|-------------|
| `apps/api/src/modules/health/health.service.ts` | 6-service health checks, queue depths, incident log, restart with cooldown |
| `apps/api/src/modules/health/health.controller.ts` | REST endpoints: snapshot, SSE stream, restart |
| `apps/api/src/modules/health/health.module.ts` | HealthService registered as provider |
| `apps/api/src/trpc/router.ts` | 3 new procedures: `health.getSnapshot`, `health.getIncidents`, `health.restartService` |
| `packages/types/src/context.ts` | 4 new exported interfaces: `ServiceHealthEntry`, `QueueDepthEntry`, `HealthSnapshot`, `IncidentEntry` |

### Frontend

| File | Description |
|------|-------------|
| `apps/web/hooks/useEventSource.ts` | Fetch-based SSE hook with Clerk JWT auth and auto-reconnect |
| `apps/web/app/(app)/system-health/page.tsx` | Server component with ADMIN role guard |
| `apps/web/components/system-health/system-health-client.tsx` | Main page shell — SSE + polling, summary chips, layout |
| `apps/web/components/system-health/service-table.tsx` | Service process table with status badges, metric bars |
| `apps/web/components/system-health/queue-depths.tsx` | BullMQ queue depths table with color-coded counts |
| `apps/web/components/system-health/incident-log.tsx` | Incident log with status dots and resolved/open badges |
| `apps/web/components/system-health/detail-panel.tsx` | Per-service stats panel, action buttons, cooldown note |
| `apps/web/components/system-health/restart-modal.tsx` | Confirmation modal requiring exact service name input |

---

## Architecture Decisions

**SSE via `reply.hijack()`** — NestJS on Fastify requires manual response takeover to prevent the framework from auto-finalizing the response. `reply.hijack()` + `reply.raw.writeHead()` + `reply.raw.write()` is the established pattern for SSE.

**Fetch-based SSE client** — Native `EventSource` API does not support `Authorization` headers. The `useEventSource` hook uses `fetch()` with `Authorization: Bearer {token}` and reads the stream via `response.body.getReader()` + `TextDecoder`.

**Direct `new HealthService()` in tRPC router** — Consistent with the existing monorepo pattern where services are instantiated directly in the tRPC router (not DI-injected), since the router is not a NestJS module.

**60s restart cooldown via Redis NX** — `SET health:restart-cooldown:{name} 1 NX EX 60` prevents accidental duplicate restarts. Returns 409 if cooldown is active.

---

## QA Sign-off

- All 8 backend jobs completed ✅
- All 8 frontend jobs completed ✅
- TypeScript clean for all new files (both api and web) ✅
- ADMIN role guard verified on page and all tRPC procedures ✅
- Incident log scoped to `SERVICE_` prefix audit actions ✅
- Restart allow-list enum in tRPC schema (6 service names) ✅

---

## Known Limitations / Future Work

- Service metric sparklines are omitted (static stats only) — Phase 2 enhancement
- `nextjs-web` health check probes `localhost:3000` — does not cross-environment well in production; update URL via env var for deployment
- Restart for `mssql-db`, `postgres-analytics`, and `redis` show "Test Conn" / "Reset Pool" placeholder buttons — actual connection reset logic deferred to Phase 2
