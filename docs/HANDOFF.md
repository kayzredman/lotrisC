# Lotris — Machine migration & session handoff

> **Last updated:** July 2026  
> **Branch:** `dev` @ `607a8fd` (synced with `origin/dev`)  
> **Repo:** [github.com/kayzredman/lotrisC](https://github.com/kayzredman/lotrisC.git)  
> **Purpose:** Pick up Phase 8 on a new machine without relying on Cursor chat history.

---

## 1. Clone & bootstrap (new machine)

```bash
git clone https://github.com/kayzredman/lotrisC.git
cd lotrisC
git checkout dev
pnpm install
```

**Prerequisites:** Node ≥ 20, pnpm 9, .NET 9 SDK, Docker Desktop (for dev MSSQL/Redis/Qdrant).

**Start dev infra:**

```bash
docker compose -f docker/docker-compose.yml up -d mssql redis qdrant
```

**Start API + web:**

```bash
pnpm api:restart          # background API on :5153 (starts docker deps if needed)
pnpm --filter @lotris/web dev   # http://localhost:3000
```

If Next.js is stale after switching machines: `pnpm web:dev-reset`.

---

## 2. Local dev URLs & credentials

| Surface | URL |
|---------|-----|
| Web app | `http://localhost:3000` |
| C# API | `http://localhost:5153` |
| OpenAPI / Scalar | `http://localhost:5153/openapi` |
| Ops console | `http://localhost:3000/ops` |
| Monitor wall | `http://localhost:3000/monitor` |
| Dev MSSQL | `localhost:1433` |
| Dev Redis | `localhost:6379` |
| Qdrant (semantic search) | `http://localhost:6333` |

**Ops login (seeded in dev):** `admin-loose@test.local` / `Test1234!`

**Dev role switch:** `/api/dev-login?user=kwame` (404 in production).

---

## 3. Where we left off (Phase 8)

**Status:** Phase 8 **MVP + 8.1 + 8.2 complete** on `origin/dev` @ `607a8fd`. Ready for smoke, on-prem validation, and merge to `main`.

### Phase 8.2 — `607a8fd` (on `origin/dev`)

| Area | What |
|------|------|
| **On-prem unlock** | `Lotris:DeploymentMode=OnPrem` or `Lotris:DisablePaymentGates=true` → all intelligence features + quota bypass (no Stripe gates on-prem) |
| **Qdrant RAG** | Vector sidecar, semantic search with keyword/SQL fallback; graceful startup if Qdrant down |
| **RCA approvals** | DRAFT → IN_REVIEW → APPROVED → PUBLISHED; `POST /api/v1/rca/{id}/approve`; migration `0015_rca_approvals.sql` |
| **Minor parity** | Health RBAC: IT_MANAGER + TEAM_LEAD on snapshot/SSE/incidents; `GET /health/store`, `POST /health/store/repair` stubs |

### Phase 8.1 — `4027367`

| Area | What |
|------|------|
| **Scheduled report email** | Hangfire delivers generated reports to `DeliveryRecipients` |
| **Similar incidents** | Ticket drawer shows related incidents via intelligence search |
| **Auto-index closed tickets** | Tenant setting wired; closed tickets ingested to knowledge index |
| **Recurring incident digest** | Hangfire job for periodic incident summaries |
| **EF migration** | `DeliveryRecipients` column fix (`0014` + EF migration) |

### Phase 8 MVP — `45dc74c` and earlier

| Area | What |
|------|------|
| **Intelligence & AI Setup** | Multi-provider connect, feature toggles |
| **Knowledge Base** | Ask Knowledge Base Q&A, seed scripts |
| **Problems / RCA** | List + wizard; AI suggest with knowledge fallback |
| **Reports** | Generate polling, schedules, download fix |
| **Admin** | Team/user edit modals |

**Full changelog:** [PHASE-8-UPDATES.md](PHASE-8-UPDATES.md)

### Phase 7 (complete)

Phase 7 parity gate **complete** — REST parity shipped; NestJS/tRPC decommissioned July 2026. See commits through `e953a4b`.

### Phase 7 gate checklist

| # | Item | Status |
|---|------|--------|
| 1 | FSM + tenant isolation | ✅ `dotnet test` |
| 2 | P1 REST gaps | ✅ batch-reassign, monitor, team-workload |
| 3 | Queue / SLA / mutex | ✅ `pnpm gate:queue` |
| 4 | SSE (notifications + health) | ✅ `pnpm gate:sse` |
| 5 | On-prem compose smoke | ⏳ `pnpm onprem:smoke` — config ready |
| 6 | NestJS decommission | ✅ |

### Explicitly deferred (post–Phase 8)

- ETL/analytics gate (job reschedule, run-now cooldown)
- Real service restart wiring from `/ops` (audit-only today)
- API break-glass `/health/console`
- Stripe / SaaS payment UI (on-prem uses `DisablePaymentGates`)

---

## 4. Verification commands

```bash
# Restart API (failsafe — docker deps + health wait)
pnpm api:restart

# Full integration suite
cd src && dotnet test

# REST smoke (authenticated)
pnpm smoke:phase5

# Phase 7 gate scripts
pnpm gate:queue
pnpm gate:sse

# OpenAPI refresh after API changes
pnpm api:sync

# On-prem (clean VM or when Docker is healthy)
cp deploy/.env.onprem.example deploy/.env.onprem
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem up -d --build
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem --profile bootstrap run --rm bootstrap
pnpm onprem:smoke
```

---

## 5. On-prem

On-prem compose sets `Lotris__DeploymentMode=OnPrem` and `Lotris__DisablePaymentGates=true` — **all intelligence features unlocked**, no payment gates.

| Port | Service |
|------|---------|
| **9090** | nginx proxy — browser URL (`PUBLIC_BASE_URL`) |
| **9091** | API direct (debug / OpenAPI) |
| **9092** | web direct (debug) |

Local dev (`:3000`, `:5153`, `:1433`, `:6379`, `:6333`) uses separate volumes from on-prem (`lotris_onprem_*`).

See [deploy/INSTALL.md](../deploy/INSTALL.md).

---

## 6. Git remotes

| Remote | URL | Use |
|--------|-----|-----|
| `origin` | `https://github.com/kayzredman/lotrisC.git` | **Canonical** |
| `legacy` | `https://github.com/kayzredman/lotris.git` | NestJS-era reference |

**Workflow:** feature work on **`dev`** → QA certifies → push `origin dev` and merge to `main`. See [GIT-WORKFLOW.md](GIT-WORKFLOW.md).

---

## 7. Cursor / agent context (does NOT travel via git)

| Asset | Location | On new machine |
|-------|----------|----------------|
| **This handoff + project docs** | `docs/` in repo | ✅ Clone |
| **Agent instructions** | `.github/copilot-instructions.md`, `.github/agents/*.instructions.md` | ✅ Clone |
| **Chat sessions** | Cursor app | ❌ Start fresh; point agent at this file |
| **User rules** | Cursor Settings → Rules | Re-add or sync |
| **Skills** | `~/.cursor/skills-cursor/` | Copy or reinstall |
| **MCP servers** | Cursor Settings → MCP | Reconfigure |

**Recommended first prompt on new machine:**

> Read `docs/HANDOFF.md` and `docs/INTELLIGENCE-DEV-SETUP.md`. Run `pnpm api:restart` and continue Phase 8 QA or on-prem smoke.

---

## 8. Recommended next steps

1. **Smoke** — `pnpm smoke:phase5` (local), then `pnpm onprem:smoke` when on-prem stack is up
2. **Intelligence (local)** — Connect ChatGPT/OpenAI per [INTELLIGENCE-DEV-SETUP.md](INTELLIGENCE-DEV-SETUP.md); optional Qdrant for semantic search
3. **Phase 8 QA** — RCA approvals, Knowledge semantic search, scheduled reports + email, on-prem all-features-unlocked
4. **Release** — merge `dev` → `main` per [GIT-WORKFLOW.md](GIT-WORKFLOW.md) after QA certifies

### Deferred (post–Phase 8.2)

| Item | Notes |
|------|-------|
| Stripe / SaaS entitlements UI | Cloud-only; on-prem bypasses via `DisablePaymentGates` |
| Real `/ops` service restart | docker/k8s wiring — audit-only today |
| On-prem smoke validation | Config ready; run when VM/Docker available |
| ETL gate | Phase 7 deferred item |

---

## 9. Key doc index

| Doc | Purpose |
|-----|---------|
| [PHASE-8-UPDATES.md](PHASE-8-UPDATES.md) | Phase 8 implementation changelog (8.0–8.2) |
| [PHASE-8-RESEARCH.md](PHASE-8-RESEARCH.md) | RCA & intelligence research |
| [INTELLIGENCE-DEV-SETUP.md](INTELLIGENCE-DEV-SETUP.md) | Local dev AI + Qdrant setup |
| [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md) | Customer Entra + Copilot deploy |
| [PARITY-AUDIT.md](PARITY-AUDIT.md) | tRPC → REST mapping (~100%) |
| [TOOLS.md](TOOLS.md) | `/ops`, scripts, `pnpm api:restart` |
| [REFACTOR.md](REFACTOR.md) | C# refactor phases & gate checklist |
| [API.md](API.md) | REST endpoint index |
| [deploy/INSTALL.md](../deploy/INSTALL.md) | On-prem install |
| [CONTEXT.md](CONTEXT.md) | Full product spec |

---

_Lotris handoff — July 2026._
