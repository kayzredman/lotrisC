# Lotris — GitHub Copilot Instructions

> These instructions apply to all AI-assisted work on the Lotris codebase.
> Agent-specific rules are in `.github/agents/`.

---

## Project Overview
**Lotris** — Multi-tenant IT Help Desk Ticket & KPI Management System  
Tagline: _"Where performance surfaces."_  
Repo: https://github.com/kayzredman/lotris.git  
Mockups: `/mockups/*-v2.html` + `/mockups/style-v2.css`

---

## 3-Agent Workflow

All work is coordinated through three agents:

| Agent | File | Responsibility |
|-------|------|----------------|
| **QA Agent** | `.github/agents/qa-agent.instructions.md` | Assigns jobs, validates, quality-checks, pushes to `dev`, updates docs |
| **Frontend Dev Agent** | `.github/agents/frontend-agent.instructions.md` | Next.js 15, UI, tRPC client, Tailwind, ShadCN |
| **Backend Dev Agent** | `.github/agents/backend-agent.instructions.md` | NestJS, Drizzle, tRPC server, BullMQ, DBs |

**The QA Agent always goes first.** It assigns work, sets acceptance criteria, and merges to `dev` after verification. Frontend and Backend agents work in parallel where possible.

---

## Git Branch Strategy

```
main    ← production releases (tagged vX.Y.Z). QA merges dev → main at milestones only.
dev     ← integration. QA agent pushes here after quality checks.
feature/sprint-X-Y-<description>  ← work branches off dev; one per sprint job
```

**Commit format:** `[Sprint X] type(scope): description`  
Types: `feat` · `fix` · `refactor` · `test` · `chore` · `docs`

---

## Absolute Rules (all agents)

1. **Stack is fixed** — see `docs/CONTEXT.md` Section 13. No new dependencies without a documented rationale committed to `docs/CONTEXT.md`.
2. **MSSQL = operational DB only.** PostgreSQL = analytics only. Do not cross-write.
3. **Every MSSQL query must include a `tenantId` filter.** Zero exceptions. Multi-tenancy is the system's foundational invariant.
4. **Clerk owns identity.** NestJS issues internal scoped JWTs `{ tenantId, userId, role }`. Frontend never handles raw Clerk session tokens in business logic.
5. **TypeScript strict mode.** No `any`. No suppressed type errors.
6. **Security:** Input validation at every boundary. No secrets in code. Rate limiting on all public endpoints. Audit log for all destructive actions.
7. **BullMQ jobs are idempotent.** If a job runs twice the result is the same.
8. **Queue ordering invariant:** `priority DESC, sla_deadline ASC`. This must never silently change.
9. **mockups/ is read-only reference.** Do not modify mockup files during the build. They are the design source of truth.
10. **docs/CONTEXT.md and docs/SPRINTS.md are living documents.** QA Agent updates them after every sprint.

---

## Key File Map

| What | Where |
|------|-------|
| Full product spec | `docs/CONTEXT.md` |
| Sprint tracker | `docs/SPRINTS.md` |
| Sprint reviews | `docs/reviews/SPRINT_X_REVIEW.md` |
| UI mockups | `mockups/*-v2.html` |
| Design tokens (CSS) | `mockups/style-v2.css` |
| Drizzle schemas | `packages/db/schemas/` |
| Shared tRPC types | `packages/types/src/trpc.ts` |
| Env validation | `packages/config/src/env.ts` |
| NestJS modules | `apps/api/src/modules/` |
| Next.js app | `apps/web/app/` |
| BullMQ workers | `workers/jobs/` |
