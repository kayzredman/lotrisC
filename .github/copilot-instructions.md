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

## 4-Agent Workflow

All work is coordinated through four agents (small teams may fold Platform into Backend):

| Agent | File | Responsibility |
|-------|------|----------------|
| **QA Agent** | `.github/agents/qa-agent.instructions.md` | Assigns jobs, OpenAPI contract approval, CI gate, merges to `dev`, updates docs |
| **Frontend Dev Agent** | `.github/agents/frontend-agent.instructions.md` | Next.js 15, UI, OpenAPI client, Tailwind, ShadCN — **ui-ux-pro-max skill required** |
| **Backend Dev Agent** | `.github/agents/backend-agent.instructions.md` | NestJS (legacy) / ASP.NET Core (refactor), DB, background jobs |
| **Platform Agent** | `.github/agents/platform-agent.instructions.md` | Docker, Helm, CI/CD, on-prem bootstrap |

**The QA Agent always goes first.** CI must pass before merge to `dev` — not agent self-attestation alone.

```
QA Agent
  ├── Backend Agent  ──▶ OpenAPI spec
  ├── Frontend Agent ◀── OpenAPI spec + ui-ux-pro-max
  └── Platform Agent ──▶ CI green + compose smoke
```

---

## Git Branch Strategy

Full policy: [`docs/GIT-WORKFLOW.md`](docs/GIT-WORKFLOW.md)

```
main     ← PRODUCTION on lotrisC. QA merges dev → main at milestones; tag vX.Y.Z.
dev      ← DEFAULT. All work here first. Push after QA + CI green.
feature/phase-X-*  ← optional off dev
```

**Remote:** `origin` = https://github.com/kayzredman/lotrisC.git

> **Rule:** Work on `dev`. Promote to `main` only when QA is done **and** tested.

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
