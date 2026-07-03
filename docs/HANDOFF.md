# Lotris — Machine migration & session handoff

> **Last updated:** July 2026  
> **Branch:** `dev` @ `5deebc0` (pushed to `origin/dev`)  
> **Repo:** [github.com/kayzredman/lotrisC](https://github.com/kayzredman/lotrisC.git)  
> **Purpose:** Pick up Phase 7 on a new machine without relying on Cursor chat history.

---

## 1. Clone & bootstrap (new machine)

```bash
git clone https://github.com/kayzredman/lotrisC.git
cd lotrisC
git checkout dev
pnpm install
```

**Prerequisites:** Node ≥ 20, pnpm 9, .NET 9 SDK, Docker Desktop (for dev MSSQL/Redis).

**Start dev infra:**

```bash
docker compose -f docker/docker-compose.yml up -d
```

**Start API + web** (separate terminals or your usual process manager):

```bash
cd src/Lotris.Api && dotnet run          # http://localhost:5153
pnpm --filter @lotris/web dev            # http://localhost:3000
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

**Ops login (seeded in dev):** `admin-loose@test.local` / `Test1234!`

**Dev role switch:** `/api/dev-login?user=kwame` (404 in production).

---

## 3. Where we left off (Phase 7)

**Status:** Phase 7 parity gate **complete** — REST parity shipped; NestJS/tRPC decommissioned July 2026.

### Shipped in `5deebc0`

| Area | What |
|------|------|
| **P1 REST parity** | `POST /api/v1/tickets/batch-reassign`, `GET /api/v1/monitor/stats` (public), `GET /api/v1/analytics/team-workload?teamId=` |
| **Frontend** | Hooks wired in `useTickets`, `useMonitor`, `useAnalytics` |
| **SSE fix** | Notifications stream sends `: connected` handshake frame (`SseConnectionManager.cs`) |
| **Gate tests** | FSM lifecycle, tenant isolation, queue mutex (`QueueEngineGateTests`), SSE script |
| **Docs** | `PARITY-AUDIT.md`, `REFACTOR.md`, OpenAPI sync |

### Phase 7 gate checklist

| # | Item | Status |
|---|------|--------|
| 1 | FSM + tenant isolation | ✅ `dotnet test` — lifecycle + `TenantIsolationIntegrationTests` |
| 2 | P1 REST gaps | ✅ batch-reassign, monitor, team-workload |
| 3 | Queue / SLA / mutex | ✅ `pnpm gate:queue` |
| 4 | SSE (notifications + health) | ✅ `pnpm gate:sse` |
| 5 | On-prem compose smoke | ✅ `pnpm onprem:smoke` on this machine |
| 6 | NestJS decommission | ✅ `apps/api`, `workers/`, tRPC client removed |

### Explicitly deferred (post–Phase 7 cutover)

- ETL/analytics gate (job reschedule, run-now cooldown)
- Real service restart wiring from `/ops` (audit-only today)
- API break-glass `/health/console`
- NestJS-only `health.storeHealth` / `repairStore` — **drop for on-prem** (P3)

### Remaining parity notes

- Only dev-only gap: `health.storeHealth` / `repairStore` (see [PARITY-AUDIT.md](PARITY-AUDIT.md))
- Health snapshot RBAC is **stricter on REST** (Admin-only vs legacy IT_MANAGER) — decide if alignment needed

---

## 4. Verification commands

```bash
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

**Living status board:** [mockups/lotris-status-phase7.html](../mockups/lotris-status-phase7.html) (browser localStorage checklist).

---

## 5. On-prem (deferred — ready when you are)

On-prem was **not validated** on the previous machine (Docker disk failure during first build). Config is packed for a later run:

| Port | Service |
|------|---------|
| **9090** | nginx proxy — browser URL (`PUBLIC_BASE_URL`) |
| **9091** | API direct (debug / OpenAPI) |
| **9092** | web direct (debug) |

Local dev (`:3000`, `:5153`, `:1433`, `:6379`) is unaffected — on-prem uses separate volumes (`lotris_onprem_*`).

```bash
cp deploy/.env.onprem.example deploy/.env.onprem
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem up -d --build
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem --profile bootstrap run --rm bootstrap
pnpm onprem:smoke   # defaults to http://localhost:9090
```

---

## 6. Git remotes

| Remote | URL | Use |
|--------|-----|-----|
| `origin` | `https://github.com/kayzredman/lotrisC.git` | **Canonical** — clone this |
| `legacy` | `https://github.com/kayzredman/lotris.git` | Old NestJS-era repo (reference only) |

**Workflow:** feature work on **local `dev`** → **QA Agent certifies** → push `origin dev` and `origin main` (merge local `dev` → local `main` first). See [GIT-WORKFLOW.md](GIT-WORKFLOW.md).

---

## 7. Cursor / agent context (does NOT travel via git)

| Asset | Location | On new machine |
|-------|----------|----------------|
| **This handoff + project docs** | `docs/` in repo | ✅ Clone |
| **Agent instructions** | `.github/copilot-instructions.md`, `.github/agents/*.instructions.md` | ✅ Clone |
| **Chat sessions** | Cursor app / `~/.cursor/projects/...` | ❌ Copy manually or start fresh; point agent at this file |
| **User rules** (commit protocol, etc.) | Cursor Settings → Rules | Re-add or sync via Cursor account |
| **Skills** (`ui-ux-pro-max`, etc.) | `~/.cursor/skills-cursor/`, `~/.agents/skills/` | Copy from old machine or reinstall |
| **MCP servers** (e.g. Sanity) | Cursor Settings → MCP | Reconfigure |

**Recommended first prompt on new machine:**

> Read `docs/HANDOFF.md` and `docs/REFACTOR.md`. Continue Phase 7 — on-prem smoke, then NestJS decommission discussion.

---

## 8. Recommended next steps

1. **Green dev stack** — Docker infra, API `:5153`, web `:3000`, run `pnpm smoke:phase5`
2. **On-prem smoke** on clean Docker or VM — `pnpm onprem:smoke`
3. **Post–Phase 7** — merge `dev` → `main` per [GIT-WORKFLOW.md](GIT-WORKFLOW.md); tag release

---

## 9. Key doc index

| Doc | Purpose |
|-----|---------|
| [REFACTOR.md](REFACTOR.md) | C# refactor phases & gate checklist |
| [PARITY-AUDIT.md](PARITY-AUDIT.md) | tRPC → REST mapping (~95%) |
| [API.md](API.md) | REST endpoint index |
| [TOOLS.md](TOOLS.md) | `/ops`, `/monitor`, scripts |
| [deploy/INSTALL.md](../deploy/INSTALL.md) | On-prem install |
| [CONTEXT.md](CONTEXT.md) | Full product spec |

---

_Lotris handoff — July 2026._
