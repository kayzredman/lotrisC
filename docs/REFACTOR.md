# Lotris — C# Backend Refactor & On-Prem Roadmap

> Last updated: June 2026  
> Status: **Phase 5 complete** — frontend OpenAPI migration, API docs stack, live-data UI polish; Phase 4 analytics/on-prem prep done  
> Default branch: `dev` (NestJS stack remains active until parity gate)

This document is the **single entry point** for the next major phase of Lotris: migrating the backend to **ASP.NET Core**, preparing **on-prem deployment**, and evolving the **agent workflow** and **UI/UX standards**.

Related docs:

| Doc | Purpose |
|-----|---------|
| [CONTEXT.md](CONTEXT.md) | Full product spec (Sections 18–20 cover refactor context) |
| [DATABASE-STRATEGY.md](DATABASE-STRATEGY.md) | **Decided** — MSSQL tiered analytics (Option B+); Postgres removed from on-prem stack |
| [design-system.md](design-system.md) | UI tokens, UX standards, `ui-ux-pro-max` usage |
| [API.md](API.md) | **Canonical REST API index** + links to Scalar UI and OpenAPI JSON |
| [ONBOARDING-REFACTOR.md](ONBOARDING-REFACTOR.md) | Onboarding wizard API + on-prem bootstrap |
| [STAGING.md](STAGING.md) | Current cloud staging (Vercel/Railway) — superseded for on-prem by `docker-compose.onprem.yml` (Phase 6) |
| [SPRINTS.md](SPRINTS.md) | Sprint history (Sprints 1–23 complete on NestJS stack) |

---

## 1. Why refactor

The NestJS/BullMQ stack delivered 15 milestones on `dev`, but on-prem and enterprise deployment need:

- **Self-contained auth** — hybrid Entra ID, ASP.NET Identity, and LDAP/AD (no Clerk cloud dependency)
- **Native MSSQL integration** — Hangfire job storage, EF Core migrations, familiar ops for IT teams
- **Full Docker packaging** — API + web + workers + databases in one compose file
- **Enforced quality gates** — CI must pass before merge (tests, lint, smoke)
- **OpenAPI contract** — replace tRPC as the frontend/backend handoff

The **Next.js frontend stays**. Only the data layer and auth UI change in Phase 5.

---

## 2. Target architecture

```
Browser
  └─▶ Reverse proxy (Traefik / nginx) — TLS
        ├─▶ apps/web          Next.js 15 (OpenAPI client + React Query)
        └─▶ src/Lotris.Api    ASP.NET Core 9 (REST + OpenAPI + SSE)
              ├─▶ MSSQL       dbo (operational) + analytics schema + Hangfire
              └─▶ Redis       Cache, SSE pub/sub, auto-assign mutex
```

**Replace:** NestJS API, Node BullMQ workers, tRPC, Clerk, **PostgreSQL**.  
**Keep:** Ticket lifecycle FSM, multi-tenancy, queue engine invariants, brand/UI shell, mockups as reference.

**Analytics (decided):** Three tiers — live MSSQL reads, 5-min incremental rollup to `analytics.*`, 2× daily report batch. See [DATABASE-STRATEGY.md](DATABASE-STRATEGY.md).

---

## 3. Migration phases

| Phase | Focus | Duration (est.) |
|-------|--------|-----------------|
| **0** | C# scaffold, EF migrations (`dbo` + `analytics` schema), Identity auth, OpenAPI, Dockerfile | 2–3 weeks |
| **1** | Tickets + queue + Hangfire SLA jobs + integration tests | **Complete** |
| **2** | Tasks, admin, notifications SSE, audit log | **Complete** — REST parity, MailKit/Hangfire notifications, SSE |
| **3** | KPI engine, QuestPDF/ClosedXML reports | **Complete** — KPI REST parity, 3-layer scoring, import, Hangfire report jobs |
| **4** | MSSQL analytics rollups, **sysadmin-configurable job timing**, dashboard trends, KPI trends, IMAP intake | **Complete** |
| **5** | Frontend OpenAPI migration, **API documentation** (Scalar UI, committed spec, TS codegen), **ui-ux-pro-max** UX pass, demo-data removal | **Complete** |
| **6** | `docker-compose.onprem.yml`, Helm chart, bootstrap scripts | 2 weeks |
| **7** | Parity gate, load test, decommission NestJS + Node workers | 1 week |

**Strategy:** Strangler fig — run NestJS and C# API in parallel behind a reverse proxy until parity checklist passes.

**Solution layout (new):**

```
lotris/
├── apps/web/                 ← keep
├── src/                      ← NEW .NET solution
│   ├── Lotris.Api/
│   ├── Lotris.Application/
│   ├── Lotris.Domain/
│   ├── Lotris.Infrastructure/
│   ├── Lotris.Workers/       ← Hangfire jobs
│   └── Lotris.Contracts/
├── docker/
│   ├── docker-compose.yml           ← dev infra (unchanged)
│   ├── docker-compose.onprem.yml    ← full stack (Phase 6)
│   └── helm/lotris/
└── apps/api/                 ← deprecate after Phase 7
```

---

## 4. Hybrid auth (on-prem)

Per-environment provider toggles — teams choose what fits:

| Provider | Config | Best for |
|----------|--------|----------|
| **Entra ID** | `Auth:Providers:Entra:Enabled` | Enterprise OIDC, hybrid cloud |
| **ASP.NET Identity** | `Auth:Providers:Identity:Enabled` | Air-gapped, local accounts |
| **LDAP/AD** | `Auth:Providers:Ldap:Enabled` | Existing Active Directory |

All providers issue a **Lotris JWT** (`JWT_SECRET`) with `{ userId, tenantId, role }` after successful auth. Frontend reads `NEXT_PUBLIC_AUTH_PROVIDERS=entra,identity,ldap`.

---

## 5. Agent workflow (4 agents)

Evolved from the original 3-agent model. See [CONTEXT.md §18](CONTEXT.md) and `.github/agents/`.

| Agent | Scope |
|-------|--------|
| **QA / Tech Lead** | Job assignment, OpenAPI contract approval, merge gate, doc updates |
| **Backend** | `src/Lotris.*`, EF, Hangfire, xUnit |
| **Frontend** | `apps/web/`, `packages/ui/` — **must use `ui-ux-pro-max` skill** for UI changes |
| **Platform** | `docker/`, `deploy/`, Helm, `.github/workflows/` |

**Hard gates (non-negotiable):**

1. GitHub Actions green before merge to `dev`
2. OpenAPI spec is the API contract (no ad-hoc tRPC during refactor)
3. Frontend UI changes invoke the **ui-ux-pro-max** Cursor skill
4. Human clean-VM install test at Phase 6/7

Small teams may fold Platform into Backend and keep 3 agents — the orchestrator + CI gates matter most.

---

## 6. UI/UX during refactor

Phase 5 is not just a tRPC → REST swap. Every touched page gets a **ui-ux-pro-max** pass:

- Auth hub (multi-provider login)
- Onboarding wizard — **see [ONBOARDING-REFACTOR.md](ONBOARDING-REFACTOR.md)** (persist gaps, on-prem bootstrap, auth-aware invites)
- Dashboard, queue, ticket drawer
- KPI agreement flows
- System health, landing, request-access

Decisions are recorded in [design-system.md](design-system.md). Brand mark and status colours (indigo/green/amber/red) are preserved — refinement, not rebrand.

### Phase 5 — API documentation (complete)

Previously identified gaps (June 2026) and their resolution:

| Gap | Resolution |
|-----|------------|
| No single canonical API reference | [`docs/API.md`](API.md) — auth, SSE, config, full endpoint index |
| No interactive docs UI | **Scalar** at `/openapi` (configurable via `OpenApi:UiEnabled`) |
| OpenAPI dev-only | Enabled in all environments except `Testing`; JSON + UI toggles in `appsettings` |
| No frontend codegen | `openapi-typescript` → `apps/web/lib/api/generated/schema.d.ts` via `pnpm api:codegen` |

**Maintenance:** after API changes run `pnpm api:sync` (export spec → update `docs/API.md` index → regenerate TS types).

### Phase 5 — Frontend polish (complete)

- Removed marketing **DEMO** fallbacks from dashboard, tickets, tasks, KPI, reports, and audit log — pages show live API data, loading, or empty states
- Dashboard ticket volume chart wired to `GET /api/v1/dashboard/ticket-analytics`
- Reports generate flow uses `useGenerateReport` (correct API client, not legacy port 4000)
- Shared `EmptyState` component for consistent zero-data UX
- SLA warnings and queue health remain live-only (no fabricated alerts)

---

## 7. Open decisions

| Topic | Doc | Status |
|-------|-----|--------|
| Postgres vs MSSQL for analytics/reporting | [DATABASE-STRATEGY.md](DATABASE-STRATEGY.md) | **Decided — Option B+ (MSSQL tiered analytics)** |
| C# in monorepo (`src/`) vs separate repo | This doc §3 | Default: monorepo |
| License model for on-prem distribution | README | TBD |
| Onboarding refactor (7 topics) | [ONBOARDING-REFACTOR.md](ONBOARDING-REFACTOR.md) | **Decided — accepted June 2026** |
| Git remote & branch policy | [GIT-WORKFLOW.md](GIT-WORKFLOW.md) | **Decided — `dev` → QA → `main` on [lotrisC](https://github.com/kayzredman/lotrisC.git)** |
| Ops service restart (docker/k8s) | [TOOLS.md](TOOLS.md) | **Decided — deferred post Phase 6**; `/ops` restart UI is audit-only until then |

---

## 7a. Onboarding (decided)

Full spec: [ONBOARDING-REFACTOR.md](ONBOARDING-REFACTOR.md). Headlines:

- Persist all wizard fields that are shown (Phase 5); logo/theme deferred
- On-prem: `bootstrap.sh` can skip wizard; wizard re-runnable from Admin
- Step 3 adapts to Identity / Entra / LDAP
- Step 4 seeds `AnalyticsJobConfig`; sysadmin tunes on System Health
- Complete requires ≥1 team; block non-admins on `/onboarding`

## 8. Parity checklist (Phase 7 gate)

- [ ] All ~75 tRPC procedures have REST equivalents with matching RBAC
- [ ] Ticket FSM state matrix passes integration tests
- [ ] Hangfire SLA timers + auto-assign mutex under load
- [ ] Multi-tenant isolation tests
- [ ] All enabled auth providers work in Docker compose
- [ ] Public: `/request`, `/request-access`, `/monitor/stats`
- [ ] SSE: notifications + health
- [ ] Sysadmin analytics job config: change interval → Hangfire reschedules; audit log written
- [ ] Manual "Run now" on ETL jobs respects 60s cooldown
- [ ] `docker compose -f docker-compose.onprem.yml up` smoke test on clean VM

---

_Lotris refactor — Calm. Precise. Dependable._
