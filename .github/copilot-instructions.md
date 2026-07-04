# Lotris — GitHub Copilot Instructions

> These instructions apply to all AI-assisted work on the Lotris codebase.
> Agent-specific rules are in `.github/agents/`.

---

## Project Overview

**Lotris** — Multi-tenant IT Help Desk Ticket & KPI Management System  
Tagline: _"Where performance surfaces."_  
Repo: https://github.com/kayzredman/lotrisC.git  
Legacy: https://github.com/kayzredman/lotris.git (Sprint 1–23 archive)  
Mockups: `/mockups/*-v2.html` + `/mockups/style-v2.css`

**Active refactor:** C# backend + on-prem deployment — see [`docs/REFACTOR.md`](docs/REFACTOR.md)

---

## 3-Agent workflow

All work is coordinated through three agents:

| Agent | File | Responsibility |
|-------|------|----------------|
| **QA Agent** | `.github/agents/qa-agent.instructions.md` | Assigns jobs, reviews output, **certifies** work before next job/phase, pushes `dev` + `main` to `origin`, updates docs |
| **Backend Agent** | `.github/agents/backend-agent.instructions.md` | ASP.NET Core (`src/Lotris.*`), DB migrations, Hangfire — commits to local `dev` |
| **Frontend Agent** | `.github/agents/frontend-agent.instructions.md` | Next.js 15, UI, OpenAPI client, Tailwind, ShadCN — commits to local `dev` |

**The QA Agent always certifies before moving on.** Backend and Frontend do not push to remote; QA pushes after certification.

```
QA Agent (assign → review → certify → push dev + main)
  ├── Backend Agent  ──▶ commits to local dev
  └── Frontend Agent ◀── OpenAPI spec + UI work on local dev
```

---

## Git Branch Strategy

Full policy: [`docs/GIT-WORKFLOW.md`](docs/GIT-WORKFLOW.md)

```
local dev   ← DEFAULT. Backend + Frontend commit here.
  ↓ QA certifies
origin dev  ← git push origin dev
origin main ← merge local dev → local main, git push origin main
```

**Remote:** `origin` = https://github.com/kayzredman/lotrisC.git

> **Rule:** Work on local `dev`. QA certifies each job/phase before the next one starts. After certification, QA pushes **both** `dev` and `main` to keep remote current.

**Commit format:** `[Sprint X] type(scope): description`  
Types: `feat` · `fix` · `refactor` · `test` · `chore` · `docs`

---

## Absolute Rules (all agents)

1. **Stack:** C# ASP.NET Core API (`src/Lotris.*`) + Next.js 15 web (`apps/web/`). NestJS/tRPC decommissioned Phase 7.
2. **MSSQL = operational + analytics.** Single instance: `dbo` for OLTP, `analytics` schema for rollups/reports. Redis for cache/queues. See `docs/DATABASE-STRATEGY.md`.
3. **Every MSSQL query must include a `tenantId` filter.** Zero exceptions.
4. **Auth** — JWT Identity (dev/on-prem); hybrid Entra / LDAP for enterprise.
5. **TypeScript / C# strict mode.** No unjustified `any`.
6. **Security:** Input validation at every boundary. No secrets in code. Audit log for destructive actions.
7. **Background jobs idempotent** — Hangfire in C# API/workers.
8. **Queue ordering invariant:** `priority DESC, sla_deadline ASC`. Must never silently change.
9. **mockups/ is read-only reference.** Design decisions go in `docs/design-system.md`.
10. **Living docs:** `docs/CONTEXT.md`, `docs/SPRINTS.md`, `docs/REFACTOR.md` — QA updates after sprints.
11. **UI changes require ui-ux-pro-max skill** — Frontend Agent, Phase 5 pages, any visual/interaction work.

---

## Key File Map

| What | Where |
|------|-------|
| Full product spec | `docs/CONTEXT.md` |
| C# refactor & on-prem roadmap | `docs/REFACTOR.md` |
| Database strategy (open) | `docs/DATABASE-STRATEGY.md` |
| Design system & UX | `docs/design-system.md` |
| Sprint tracker | `docs/SPRINTS.md` |
| Sprint reviews | `docs/reviews/SPRINT_X_REVIEW.md` |
| UI mockups (read-only) | `mockups/*-v2.html` |
| Design tokens (CSS) | `mockups/style-v2.css` |
| Legacy MSSQL migrations (SQL files) | `packages/db/migrations/mssql/` |
| C# solution | `src/Lotris.*` |
| Next.js app | `apps/web/app/` |
| OpenAPI spec | `docs/openapi/v1.json` |
| Phase 8 handoff | `docs/HANDOFF.md`, `docs/PHASE-8-UPDATES.md` |
| Dev scripts | `pnpm api:restart`, `pnpm smoke:phase5`, `pnpm web:dev-reset` |

---

## Phase status (July 2026)

| Phase | Status |
|-------|--------|
| Phase 7 — REST parity + NestJS decommission | ✅ Complete |
| Phase 8.0 — Intelligence MVP (RCA, Knowledge, Reports) | ✅ Complete |
| Phase 8.1 — Email schedules, similar incidents, auto-index, digest | ✅ Complete @ `4027367` |
| Phase 8.2 — Qdrant RAG, RCA approvals, on-prem unlock, parity | ✅ Complete @ `607a8fd` |

**On-prem:** `Lotris:DisablePaymentGates=true` unlocks all intelligence features — no Stripe gates.

**Deferred:** Real `/ops` service restart wiring, ETL gate, SaaS payment UI.

**Verify:** `pnpm api:restart` → `cd src && dotnet test` → `pnpm smoke:phase5` → `pnpm onprem:smoke`.
