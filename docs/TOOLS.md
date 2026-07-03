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
- Package store health panel (pnpm store integrity — UI present; C# `/health/store` may be stubbed)
- **Restart service** — confirmation modal (type exact service id); 60s cooldown via Redis
- Pause / resume live stream

**Services monitored:** `lotris-api`, `nextjs-web`, `mssql-db`, `redis`, `hangfire-workers` (+ legacy names in allowlist)

**Restart reality (today):**

- `lotris-api` — triggers graceful API shutdown (process manager / docker must bring it back)
- Other services — audit logged + cooldown; **no automatic process restart yet**

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

**Data source:** Dashboard REST endpoints via `useMonitorStats` (requires API up).

---

### Dev login bypass — `/api/dev-login`

**Purpose:** Quick role switching in local dev (Clerk sign-in tokens).

| | |
|---|---|
| **URL** | `/api/dev-login?user=kwame` (yaw, kofi, abena, fatima, …) |
| **Auth** | Dev only — **404 in production** |

---

## API health endpoints

Base: `http://localhost:5153` (or `LOTRIS_API_URL`)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /health` | Public | Liveness — API process up |
| `GET /health/ready` | Public | Readiness — MSSQL, Redis, dependencies |
| `GET /health/snapshot` | ADMIN JWT | Full snapshot: services + queues |
| `GET /health/sse` | ADMIN JWT | SSE stream, ~1 snapshot/sec |
| `GET /health/incidents?limit=20` | ADMIN JWT | Recent service incidents from audit log |
| `POST /health/restart/{serviceName}` | ADMIN JWT | Request restart (cooldown, audit) |

**Probe when web is down:**

```bash
curl -s http://localhost:5153/health
curl -s http://localhost:5153/health/ready
```

---

## Shell scripts (`scripts/`)

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

**What it checks (24 checks):** public health/openapi, login, dashboard, tickets, tasks, KPIs, reports, admin, onboarding, audit, etc.

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

## pnpm root scripts (quick reference)

| Script | Command |
|--------|---------|
| Dev (all packages) | `pnpm dev` |
| Web dev reset | `pnpm web:dev-reset` |
| Phase 5 smoke | `pnpm smoke:phase5` |
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

| Item | Notes |
|------|-------|
| API-hosted break-glass console | `GET /health/console` — static HTML, no Next.js dependency |
| Real docker/k8s restart | Wire `nextjs-web`, workers to compose/supervisor |
| Analytics & ETL panel on ops | Planned on system-health (DATABASE-STRATEGY.md §11) |

---

## Maintenance

When you add a new tool (page, script, or ops endpoint):

1. Implement it
2. Add a row/section here with **URL**, **auth**, **what it can do**, and **limitations**
3. Add a `pnpm` script alias if it's a shell script developers will run often
