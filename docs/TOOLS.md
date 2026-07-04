# Lotris Tools & Ops Reference

Living catalog of operational surfaces, scripts, and API probes in this repo. Update this file when adding new tools.

---

## Web surfaces (UI)

### Ops console — `/ops`

**Purpose:** Standalone system health dashboard outside the main app shell (sidebar, onboarding guard).

| | |
|---|---|
| **URL** | `http://localhost:3000/ops` |
| **Auth** | Public route (middleware); **ADMIN / SUPERADMIN** required for data & actions |
| **Opens in** | New tab from sidebar → System Health |

**What it can do:**

- Live service status (SSE stream + 5s polling fallback)
- Summary chips: services UP / DEGRADED / DOWN
- Service table: CPU, memory, uptime, last ping, per-service detail panel
- Queue depths (Hangfire/BullMQ-style job queues)
- Incident log (last 20 `SERVICE_*` audit entries)
- Package store health panel (pnpm store integrity — C# returns stub: always healthy)
- **Restart service** — confirmation modal (type exact service id); 60s cooldown via Redis
- Pause / resume live stream

**Services monitored:** `lotris-api`, `nextjs-web`, `mssql-db`, `redis`, `hangfire-workers`, `qdrant` (when `Intelligence:QdrantUrl` is configured — shows **Degraded** if down; search falls back to keyword/SQL; no restart button)

**Restart reality (today):**

- `lotris-api` — triggers graceful API shutdown (process manager / docker must bring it back)
- Other services — audit logged + cooldown only; **no automatic process restart**

> **Decision (July 2026):** Real restart wiring (docker compose / k8s / supervisor) is a **future feature**, deferred until after Phase 6 on-prem packaging. The `/ops` UI and restart API remain for monitoring and audit; do not expect one-click recovery until that work lands.

**Legacy redirect:** `/system-health` → `/ops`

**Limitation:** Still a Next.js page. If the web app itself is down (500), use API probes below or `pnpm web:dev-reset`.

---

### Operations monitor wall — `/monitor`

**Purpose:** Public NOC-style ticket queue wall for floor displays — **not** infrastructure health.

| | |
|---|---|
| **URL** | `http://localhost:3000/monitor` |
| **Auth** | None (public) |

**What it can do:**

- Total open tickets, SLA breaches, resolved (24h)
- Per-team load bars (open / in progress / escalated)
- Animated priority ticker (top 20 tickets)
- Light / dark theme (persisted in `localStorage`)
- Auto-refresh every 30s

**Data source:** `GET /api/v1/monitor/stats` via `useMonitorStats` (public REST — no JWT).

**C# implementation:** `MonitorController` → `MonitorStatsService` (tenant-wide SQL aggregate, mirrors legacy tRPC `monitor.stats`).

---

### Dev login bypass — `/api/dev-login`

**Purpose:** Quick role switching in local dev (Clerk sign-in tokens).

| | |
|---|---|
| **URL** | `/api/dev-login?user=kwame` (yaw, kofi, abena, fatima, …) |
| **Auth** | Dev only — **404 in production** |

---

### Intelligence and AI Setup — `/admin/intelligence`

**Purpose:** Connect tenant AI provider and enable intelligence features.

| | |
|---|---|
| **URL** | `http://localhost:3000/admin/intelligence` |
| **Auth** | **ADMIN / SUPERADMIN** (leads can use intelligence features once connected) |

**What it can do:**

- Pick provider: Claude, Cursor, ChatGPT, Copilot (Microsoft), OpenAI
- Connect credentials or Microsoft OAuth (Copilot)
- Enable: RCA AI suggest, Knowledge Q&A, report narratives, Teams webhooks
- Test connection

**Docs:** [INTELLIGENCE-DEV-SETUP.md](INTELLIGENCE-DEV-SETUP.md), [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md), [PHASE-8-UPDATES.md](PHASE-8-UPDATES.md)

---

### Knowledge Base — `/knowledge`

**Purpose:** Known errors (KEDB) + Ask Knowledge Base Q&A.

| | |
|---|---|
| **URL** | `http://localhost:3000/knowledge` |
| **Auth** | Authenticated app users |

**Data:** Known errors from published RCAs; Ask KB searches `knowledge.Knowledge_Articles`. Seed: `node scripts/seed-knowledge-samples.mjs`.

---

### Problems & RCA — `/problems`, `/rca/{id}`

**Purpose:** ITIL problem records and root-cause investigation wizard.

| | |
|---|---|
| **URLs** | `/problems`, `/rca/{id}` |
| **Auth** | Authenticated; create/edit for leads |

**Seed:** `node scripts/seed-problems-demo.mjs`

---

## API health endpoints

Base: `http://localhost:5153` (or `LOTRIS_API_URL`)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /health` | Public | Liveness — API process up |
| `GET /health/ready` | Public | Readiness — MSSQL, Redis, dependencies |
| `GET /health/snapshot` | ADMIN / IT_MANAGER / TEAM_LEAD JWT | Full snapshot: services + queues |
| `GET /health/sse` | ADMIN / IT_MANAGER / TEAM_LEAD JWT | SSE stream, ~1 snapshot/sec |
| `GET /health/incidents?limit=20` | ADMIN / IT_MANAGER / TEAM_LEAD JWT | Recent service incidents from audit log |
| `POST /health/restart/{serviceName}` | ADMIN / IT_MANAGER JWT | Request restart (cooldown, audit) |
| `GET /health/store` | ADMIN / IT_MANAGER JWT | Store health stub (always healthy in C# deploy) |
| `POST /health/store/repair` | ADMIN / IT_MANAGER JWT | Store repair no-op stub |
| `GET /api/v1/monitor/stats` | Public | NOC wall — open tickets, SLA breaches, team queue depth |

**Probe when web is down:**

```bash
curl -s http://localhost:5153/health
curl -s http://localhost:5153/health/ready
```

---

## Shell scripts (`scripts/`)

### `restart-api.sh` — failsafe local API restart

**When:** After pulling API changes, migration updates, or when `/ops` restart killed the dev process.

```bash
pnpm api:restart
# foreground: bash scripts/restart-api.sh -f
# skip docker: bash scripts/restart-api.sh --skip-docker
```

**What it does:**

1. Starts docker deps if available: `mssql`, `redis`, `qdrant`
2. Kills process on port `5153` (override with `LOTRIS_API_PORT`)
3. Runs `dotnet run` in background (log: `.lotris-api.log`)
4. Waits for `GET /health` (timeout 90s)

Qdrant is optional — API starts even if vector sidecar is down (keyword/SQL search fallback).

---

### `web-dev-reset.sh` — fix stale Next.js dev cache

**When:** Pages return **500** with `Cannot find module './NNN.js'` after running `pnpm build` while `next dev` is still running.

```bash
pnpm web:dev-reset
# or
bash scripts/web-dev-reset.sh
```

**What it does:**

1. Kills process on port `3000` (override with `LOTRIS_WEB_PORT`)
2. Deletes `apps/web/.next`
3. Starts `pnpm --filter @lotris/web dev`

---

### `smoke-phase5.sh` — API integration smoke

**When:** After API changes; validates Phase 5 REST surface.

```bash
pnpm smoke:phase5
# LOTRIS_API_URL=http://localhost:5153 bash scripts/smoke-phase5.sh
```

**What it checks (27 checks):** public health/openapi/monitor, login, dashboard, analytics team-workload, tickets, tasks, KPIs, reports, admin, onboarding, audit, etc.

---

### `export-openapi.sh` — export OpenAPI spec

**Requires:** API running.

```bash
pnpm api:export
```

Writes `docs/openapi/v1.json` from `GET /openapi/v1.json`.

---

### `generate-api-docs.py` — refresh API.md endpoint index

**Requires:** `docs/openapi/v1.json` (run export first).

```bash
pnpm api:docs
```

Regenerates the `<!-- API_ENDPOINTS:START -->` section in `docs/API.md`.

---

### `seed-test-users.mjs` — Clerk test user migration

**When:** Migrating demo users to real Clerk accounts (legacy staging workflow).

```bash
node scripts/seed-test-users.mjs
```

Idempotent; creates/updates Clerk users and DB rows.

---

### `seed-lotris-digital-setup.mjs` — Lotris Digital Setup tenant

**When:** Local dev with teams/users from `docs/TEAMLIST.xlsx` and demo tickets.

```bash
pnpm seed:digital
# or: node scripts/seed-lotris-digital-setup.mjs
```

Idempotent; resolves tenant by slug `lotris-digital-setup`.

---

### `seed-knowledge-samples.mjs` — Knowledge articles (Ask Knowledge Base)

**When:** Dev/demo for Knowledge Q&A without publishing RCAs.

```bash
node scripts/seed-knowledge-samples.mjs
# optional: TENANT_ID=701fc546-342b-4b80-82e1-24b152044161
```

Seeds 3 `knowledge.Knowledge_Articles` + chunks. Does **not** populate Known Errors list (requires published RCAs).

---

### `seed-problems-demo.mjs` — Problems, RCAs, known errors

**When:** Populate Problems page and KEDB for demos.

```bash
node scripts/seed-problems-demo.mjs
```

Seeds 3 problems + RCAs (2 published) + 2 known errors.

---

## pnpm root scripts (quick reference)

| Script | Command |
|--------|---------|
| Dev (all packages) | `pnpm dev` |
| API restart | `pnpm api:restart` |
| Web dev reset | `pnpm web:dev-reset` |
| Seed Lotris Digital Setup | `pnpm seed:digital` |
| Phase 5 smoke | `pnpm smoke:phase5` |
| SSE gate | `pnpm gate:sse` |
| Queue engine gate | `pnpm gate:queue` |
| OpenAPI export + docs + codegen | `pnpm api:sync` |
| DB migrate | `pnpm db:migrate` |

---

## API source scripts (`apps/api/src/scripts/`)

| Script | Purpose |
|--------|---------|
| `seed.ts` | Base database seed |
| `seed-full.ts` | Full demo dataset |
| `fix-dev-logins.ts` | Repair dev login records |
| `etl-backfill.ts` | Analytics ETL backfill |

Run via the API package's documented npm/pnpm scripts (see `apps/api/package.json`).

---

## Future (not built)

| Item | Target | Notes |
|------|--------|-------|
| **Real service restart** | Post–Phase 6 | Wire `nextjs-web`, workers, API to docker compose / k8s / supervisor from `POST /health/restart/{name}`. UI + audit + cooldown already exist. |
| API-hosted break-glass console | Post–Phase 6 | `GET /health/console` — static HTML, no Next.js dependency |
| Analytics & ETL panel on ops | TBD | Planned on ops console (DATABASE-STRATEGY.md §11) |

---

## On-prem stack (Phase 6)

| Resource | Path / command |
|----------|----------------|
| Install guide | [`deploy/INSTALL.md`](../deploy/INSTALL.md) |
| Compose file | `docker/docker-compose.onprem.yml` |
| Env template | `deploy/.env.onprem.example` → `deploy/.env.onprem` |
| Bootstrap | `docker compose … --profile bootstrap run --rm bootstrap` |
| Smoke | `pnpm onprem:smoke` |

```bash
cp deploy/.env.onprem.example deploy/.env.onprem
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem up -d --build
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem --profile bootstrap run --rm bootstrap
```

---

## Maintenance

When you add a new tool (page, script, or ops endpoint):

1. Implement it
2. Add a row/section here with **URL**, **auth**, **what it can do**, and **limitations**
3. Add a `pnpm` script alias if it's a shell script developers will run often
