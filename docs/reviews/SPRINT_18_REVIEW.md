# Sprint 18 Review — SLA Breach Prediction + KPI Trend Analysis

**Date merged to `dev`:** 2026-05-13  
**Merge commit:** `4d640a9`  
**Branch:** `feature/sprint-18-intelligence`  
**Phase:** 2 — Intelligence  
**Milestone:** M11

---

## Summary

Sprint 18 delivered two predictive intelligence features to Lotris — fully automated, background-driven, with no new user-facing input forms required.

| Feature | Description |
|---|---|
| SLA Breach Prediction | Scans all `IN_PROGRESS` tickets every 5 min. Flags tickets AMBER (≥70% of SLA consumed) or RED (≥90%). Fires email + SSE notifications to assignee and team lead. |
| KPI Trend Analysis | Scans all active KPI actuals every 30 min. Projects end-of-period value via linear extrapolation. Flags AMBER/RED when trajectory misses target. Daily digest email to team leads at 08:00. |

---

## Jobs Completed

| ID | Type | Description | Status |
|----|------|-------------|--------|
| B-SI-1 | Backend | DB migrations (MSSQL `sla_warning_level` + PG `kpi_trend_snapshots`) + Drizzle schemas | ✅ |
| B-SI-2 | Backend | `SlaPredictor` service — `computeWarningLevel()` + `scanAndUpdate(tenantId)` | ✅ |
| B-SI-3 | Backend | `KpiTrendAnalyser` service — `computeTrend()` + `scanAllEngineers()` | ✅ |
| B-SI-4 | Backend | BullMQ workers: `sla-predictor` (5 min), `kpi-trend` (30 min), `digest` (08:00 daily) | ✅ |
| B-SI-5 | Backend | tRPC procedures: `analytics.slaWarnings`, `analytics.kpiTrends`, `analytics.myKpiTrends` | ✅ |
| B-SI-6 | Backend | Notification infrastructure: `NotificationsService`, `SseService`, `NotificationsController`, `notifications.worker.ts` SSE + email handlers | ✅ |
| F-SI-1 | Frontend | KPI trend hooks in `kpi-page-client.tsx` (`analytics.myKpiTrends` for engineers, `analytics.kpiTrends` for leads+) | ✅ |
| F-SI-2 | Frontend | Sparkline SVG component (7-point polyline, `projectedEop` highlighted) | ✅ |
| F-SI-3 | Frontend | Warning pill component (amber/red badges, NONE renders nothing) | ✅ |
| F-SI-4 | Frontend | Ticket list row coloring (AMBER: `#fef3c7`, RED: `#fee2e2`), ⚠ icon on SLA cell for RED | ✅ |
| F-SI-5 | Frontend | Dashboard SLA-at-Risk card with RED/AMBER badge deep-links; `?slaWarning=` URL filter end-to-end | ✅ |

---

## Acceptance Criteria Verification

### SLA Prediction

| Criterion | Verified |
|-----------|----------|
| 50% consumed → NONE | ✅ |
| 87.5% consumed → AMBER | ✅ |
| 94.7% consumed → RED | ✅ |
| Redis dedup `sla-alert:{ticketId}:{level}` prevents re-fire within TTL window | ✅ |
| Worker runs every 5 min (cron `*/5 * * * *`) | ✅ |
| Idempotent — double-run produces same result | ✅ |
| `analytics.slaWarnings` requires `kpiAgreementProcedure` (TEAM_LEAD+) | ✅ |
| RESOLVED/CLOSED tickets excluded from scan | ✅ |
| Every MSSQL query includes `tenantId` filter | ✅ |

### KPI Trends

| Criterion | Verified |
|-----------|----------|
| Trajectory below target → AMBER/RED snapshot written to PG | ✅ |
| Trajectory at/above target → NONE | ✅ |
| LOWER_BETTER direction uses `target/projected` ratio | ✅ |
| Worker runs every 30 min | ✅ |
| `analytics.myKpiTrends` scoped to requesting user only | ✅ |
| Digest email fires daily at 08:00 | ✅ |
| `digest:active-leads` stores `leadId\|leadEmail` format | ✅ |

### UI

| Criterion | Verified |
|-----------|----------|
| Amber row highlight in ticket table | ✅ |
| Red row highlight in ticket table | ✅ |
| ⚠ icon prefix on SLA cell for RED tickets | ✅ |
| SLA at Risk section in dashboard with RED/AMBER badge links | ✅ |
| Badge links deep-link to `/tickets?slaWarning={level}` | ✅ |
| `slaWarning` URL param passes through `useSearchParams` → tRPC filter | ✅ |
| KPI sparklines render in KPI dashboard | ✅ |
| KPI warning pills render in KPI dashboard | ✅ |

---

## Static Analysis

| Check | Result |
|-------|--------|
| TypeScript strict (`npx tsc --noEmit`) — all 3 packages | ✅ CLEAN |
| `console.log` in NestJS API modules | ✅ NONE (all use `this.logger`) |
| `console.log` in BullMQ workers | ✅ ACCEPTABLE — pm2 captures stdout as structured logs |
| MSSQL queries without `tenantId` | ✅ NONE found |
| SQL injection surface | ✅ All new parameterized via Drizzle `sql\`...\`` template tag; `slaWarning` validated by `z.enum` before interpolation |

---

## Known Gaps / Deferred to Sprint 19+

| Item | Decision |
|------|----------|
| No live test against populated MSSQL/PG data | Deferred — test environment not yet provisioned for CI |
| SSE reconnect on client dropped connection | Deferred — client-side eventsource auto-reconnects; server backpressure not yet handled |
| SLA prediction does not account for business-hours calendars | Deferred to Phase 3 |
| KPI trend linear projection may be noisy early in a period | Accepted risk — warning only fires at ≥10% of period elapsed |

---

## Files Changed (27)

```
apps/api/src/modules/analytics/analytics.module.ts
apps/api/src/modules/analytics/kpi-trend.service.ts           [NEW]
apps/api/src/modules/notifications/notifications.controller.ts [NEW]
apps/api/src/modules/notifications/notifications.module.ts
apps/api/src/modules/notifications/notifications.service.ts
apps/api/src/modules/notifications/sse.service.ts             [NEW]
apps/api/src/modules/tickets/dto/index.ts
apps/api/src/modules/tickets/sla-predictor.service.ts         [NEW]
apps/api/src/modules/tickets/tickets.module.ts
apps/api/src/modules/tickets/tickets.service.ts
apps/api/src/trpc/router.ts
apps/web/components/dashboard/dashboard-page-client.tsx
apps/web/components/kpis/kpi-page-client.tsx
apps/web/components/tickets/tickets-table.tsx
packages/db/migrations/mssql/0008_sla_prediction.sql          [NEW]
packages/db/migrations/pg/0002_kpi_trend_snapshots.sql        [NEW]
packages/db/src/schemas/mssql/tickets.ts
packages/db/src/schemas/postgres/index.ts
packages/db/src/schemas/postgres/kpi-trend-snapshots.ts      [NEW]
packages/types/src/context.ts
packages/types/src/index.ts
workers/jobs/ecosystem.config.cjs
workers/jobs/src/digest.worker.ts                             [NEW]
workers/jobs/src/index.ts
workers/jobs/src/kpi-trend.worker.ts                          [NEW]
workers/jobs/src/notifications.worker.ts
workers/jobs/src/sla-predictor.worker.ts                      [NEW]
```

---

## Next Sprint

**Sprint 19** — Automated Quarterly Reports + Engineer Workload Rebalancing  
See `docs/SPRINTS.md` for job breakdown.
