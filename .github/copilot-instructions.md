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
| **Backend Agent** | `.github/agents/backend-agent.instructions.md` | ASP.NET Core (refactor) / NestJS (legacy), DB, background jobs — commits to local `dev` |
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

1. **Stack direction** — see `docs/REFACTOR.md`. Legacy NestJS rules apply until Phase 7 cutover.
2. **MSSQL = operational + analytics.** Single instance: `dbo` for OLTP, `analytics` schema for rollups/reports. Redis for cache/queues. See `docs/DATABASE-STRATEGY.md`. Legacy NestJS stack may still use Postgres until Phase 7.
3. **Every MSSQL query must include a `tenantId` filter.** Zero exceptions.
4. **Auth** — hybrid Entra / Identity / LDAP during refactor; legacy Clerk until Phase 5 frontend migration.
5. **TypeScript / C# strict mode.** No unjustified `any`.
6. **Security:** Input validation at every boundary. No secrets in code. Audit log for destructive actions.
7. **Background jobs must be idempotent** (BullMQ → Hangfire during refactor).
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
| Drizzle schemas (legacy) | `packages/db/schemas/` |
| NestJS modules (legacy) | `apps/api/src/modules/` |
| C# solution (refactor) | `src/Lotris.*` |
| Next.js app | `apps/web/app/` |
| BullMQ workers (legacy) | `workers/jobs/` |
