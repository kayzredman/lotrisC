# Lotris — Continuous build guide

> **Audience:** Developers, QA Agent, and internal teams picking up active development on `dev`.  
> **Canonical remote:** `origin` → [github.com/kayzredman/lotrisC](https://github.com/kayzredman/lotrisC.git)  
> **Last updated:** July 2026

This is the **single entry point** for ongoing development. Customer IT and business sign-off use separate packs — see links below.

---

## 1. Clone and bootstrap

```bash
git clone https://github.com/kayzredman/lotrisC.git
cd lotrisC
git checkout dev
git pull origin dev
pnpm install
```

**Prerequisites:** Node ≥ 20, pnpm 9, .NET 9 SDK, Docker Desktop (MSSQL, Redis, Qdrant for dev).

```bash
docker compose -f docker/docker-compose.yml up -d mssql redis qdrant
pnpm api:restart
pnpm --filter @lotris/web dev    # http://localhost:3000
```

**Dev login:** `admin-loose@test.local` / `Test1234!` · API `http://localhost:5153`

Full machine migration steps: [HANDOFF.md](HANDOFF.md) §1–2.

---

## 2. Branch and push policy

| Step | Who | Action |
|------|-----|--------|
| Day-to-day work | Backend / Frontend agents | Commit on **local `dev`** |
| Certification | QA Agent | Run gates below; block next phase until green |
| Publish | QA Agent | `git push origin dev` → merge `dev` → `main` → `git push origin main` |

Details: [GIT-WORKFLOW.md](GIT-WORKFLOW.md)

---

## 3. Agent instructions (in repo)

| Agent | File |
|-------|------|
| QA / Tech Lead | [.github/agents/qa-agent.instructions.md](../.github/agents/qa-agent.instructions.md) |
| Backend | [.github/agents/backend-agent.instructions.md](../.github/agents/backend-agent.instructions.md) |
| Frontend | [.github/agents/frontend-agent.instructions.md](../.github/agents/frontend-agent.instructions.md) |
| Platform | [.github/agents/platform-agent.instructions.md](../.github/agents/platform-agent.instructions.md) |
| Copilot root | [.github/copilot-instructions.md](../.github/copilot-instructions.md) |

**Recommended first prompt on a new machine:**

> Read `docs/CONTINUOUS-BUILD.md` and `docs/HANDOFF.md`. Run `pnpm api:restart`, then continue from the current phase in HANDOFF §3.

---

## 4. QA certification gates

Run after API changes, before pushing to `origin/dev`.

| Gate | Command | When |
|------|---------|------|
| Integration tests | `cd src && dotnet test` | Any backend change |
| Phase 5 REST smoke | `pnpm smoke:phase5` | API / auth changes |
| Queue engine | `pnpm gate:queue` | Queue / SLA / mutex |
| SSE | `pnpm gate:sse` | Notifications / health stream |
| ETL / analytics jobs | `pnpm gate:etl` | Rollup / ETL admin |
| Mobile API smoke | `pnpm mobile:smoke` | Mobile + auth + devices |
| On-prem smoke | `pnpm onprem:smoke` | Docker on-prem packaging |
| OpenAPI sync | `pnpm api:sync` | New or changed REST endpoints |

Script catalog: [TOOLS.md](TOOLS.md)

---

## 5. Active workstreams (July 2026)

### Web + API (Phase 8 — largely complete)

| Doc | Purpose |
|-----|---------|
| [PHASE-8-UPDATES.md](PHASE-8-UPDATES.md) | **Changelog** — what shipped in 8.0–8.2 |
| [PHASE-8-PLAN.md](PHASE-8-PLAN.md) | Original architecture plan (reference) |
| [INTELLIGENCE-DEV-SETUP.md](INTELLIGENCE-DEV-SETUP.md) | Local AI provider + Qdrant |
| [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md) | Customer Entra + Copilot |
| [REFACTOR.md](REFACTOR.md) | C# refactor phases and parity checklist |
| [API.md](API.md) + [openapi/v1.json](openapi/v1.json) | REST contract |

### Mobile Pager (`apps/mobile`) — dev-complete

| Doc | Purpose |
|-----|---------|
| [MOBILE-PAGER-SCOPE.md](MOBILE-PAGER-SCOPE.md) | Product scope |
| [MOBILE-IMPLEMENTATION-PHASES.md](MOBILE-IMPLEMENTATION-PHASES.md) | Phased build plan |
| [MOBILE-ROLLOUT-HANDOFF.md](MOBILE-ROLLOUT-HANDOFF.md) | **Store / MDM / EAS** — internal teams |

```bash
pnpm api:restart
pnpm mobile:start          # LAN — run from repo root
pnpm mobile:smoke
```

### On-prem deployment

| Doc | Purpose |
|-----|---------|
| [deploy/INSTALL.md](../deploy/INSTALL.md) | Install and bootstrap |
| [IT-HANDOVER.md](IT-HANDOVER.md) | CIO/IT operations and security |

---

## 6. Shareable documentation packs

Generated locally — **not committed** (`docs/dist/` is gitignored).

| Pack | Command | Contents |
|------|---------|----------|
| HTML release pack | `pnpm docs:release` | BRD, IT handover, closeout → `docs/dist/index.html` |
| HTML + PDF | `pnpm docs:release:pdf` | Same + PDF (Chrome headless) |
| Marketing decks | `pnpm docs:marketing:ppt` | Executive / Sales / IT PPTX |

---

## 7. Full doc index

| Doc | Purpose |
|-----|---------|
| [GLOSSARY.md](GLOSSARY.md) | Abbreviations and terms |
| [BRD.md](BRD.md) | Business requirements — as-built scope |
| [HANDOFF.md](HANDOFF.md) | Session handoff, verification commands |
| [CONTEXT.md](CONTEXT.md) | Full product spec |
| [PARITY-AUDIT.md](PARITY-AUDIT.md) | tRPC → REST mapping |
| [DATABASE-STRATEGY.md](DATABASE-STRATEGY.md) | Analytics DB decisions |
| [STAGING.md](STAGING.md) | Cloud staging (legacy reference) |
| [PROJECT-CLOSEOUT.md](PROJECT-CLOSEOUT.md) | Repo hygiene before closeout |

---

_Lotris continuous build — July 2026._
