# Lotris — IT Handover Document

> **Audience:** CIO, IT operations, platform engineering, security  
> **Version:** 1.0  
> **Date:** July 2026  
> **Release:** July 2026 — production-ready; on-prem validated  
> **Companion:** [BRD.md](BRD.md) (business view), [deploy/INSTALL.md](../deploy/INSTALL.md) (install steps)

This document is the **technical handover** for teams taking ownership of Lotris in production or on-prem evaluation.

---

## 1. System overview

Lotris is a web application for IT help desk operations, KPI management, reporting, and AI-assisted incident intelligence.

```
                    ┌─────────────────────────────────────┐
  Users (browser)   │  nginx reverse proxy  (:9090)     │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
        Next.js web          ASP.NET Core API      (optional)
        (apps/web)           (src/Lotris.Api)      Scalar /openapi
              │                    │
              │                    ├── Hangfire workers (in-process)
              │                    │
              └────────────────────┼────────────────────┐
                                   ▼                    ▼
                            MSSQL Server            Redis
                     (operational + analytics        (cache, mutex,
                      + Hangfire storage)            SSE pub/sub)
                                   │
                                   ▼
                            Qdrant (optional)
                         vector search / RAG
```

**Technology stack:**

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, Tailwind, React Query |
| API | ASP.NET Core 9, REST + OpenAPI 3.1 + SSE |
| Jobs | Hangfire (MSSQL-backed) |
| Database | Microsoft SQL Server 2022 |
| Cache | Redis 7 |
| Vector DB | Qdrant (semantic search) |
| Packaging | Docker Compose (on-prem), optional Helm chart |

---

## 2. Deployment options

### 2.1 On-prem (recommended for enterprise)

Single-host Docker Compose — all services included.

| Artefact | Path |
|----------|------|
| Compose file | `docker/docker-compose.onprem.yml` |
| Env template | `deploy/.env.onprem.example` |
| Install guide | [deploy/INSTALL.md](../deploy/INSTALL.md) |
| Bootstrap | `deploy/scripts/bootstrap.sh` (profile `bootstrap`) |
| Smoke test | `scripts/onprem-smoke.sh` |

**Default ports (configurable):**

| Port | Service |
|------|---------|
| 9090 | nginx — **primary browser URL** |
| 9091 | API direct (debug, OpenAPI) |
| 9092 | web direct (debug) |

**Minimum host:** 8 GB RAM, Docker Engine 24+, Compose v2.

### 2.2 Kubernetes (optional)

Helm chart at `docker/helm/lotris/` deploys API + web against **external** MSSQL and Redis. Use when a platform team manages data stores separately.

### 2.3 Developer workstation

Not for production — local dev uses `docker/docker-compose.yml` (MSSQL, Redis, Qdrant) + `pnpm api:restart` + `pnpm --filter @lotris/web dev`. See [HANDOFF.md](HANDOFF.md).

---

## 3. Installation summary

Full steps: [deploy/INSTALL.md](../deploy/INSTALL.md).

```bash
# 1. Configure
cp deploy/.env.onprem.example deploy/.env.onprem
# Edit passwords, JWT_SECRET (≥32 chars), PUBLIC_BASE_URL

# 2. Start stack
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem up -d --build

# 3. Bootstrap admin (Track A — production)
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem \
  --profile bootstrap run --rm bootstrap

# 4. Verify
bash scripts/onprem-smoke.sh
```

**First boot:** Allow 2–4 minutes for MSSQL migrations. If API shows unhealthy on first `up --build`, wait ~30s and run `up -d` again, then bootstrap.

**Browser URLs after install:**

| Surface | Path |
|---------|------|
| Application | `http://<host>:9090/` |
| Ops console | `/ops` |
| Monitor wall | `/monitor` |
| OpenAPI / Scalar | `/openapi` (disable in hardened prod) |
| Health | `/health`, `/health/ready` |

---

## 4. Configuration reference

Copy `deploy/.env.onprem.example` → `deploy/.env.onprem`. Critical variables:

| Variable | Purpose |
|----------|---------|
| `PUBLIC_BASE_URL` | Browser-facing URL (must match CORS) |
| `MSSQL_SA_PASSWORD` | SQL Server SA password |
| `JWT_SECRET` | JWT signing key (≥ 32 characters) |
| `REDIS_PASSWORD` | Redis auth |
| `LOTRIS_ADMIN_EMAIL` / `LOTRIS_ADMIN_PASSWORD` | First admin (bootstrap) |
| `LOTRIS_SKIP_ONBOARDING` | `true` = production; `false` = demo wizard |
| `NEXT_PUBLIC_AUTH_PROVIDERS` | `identity`, `entra`, `ldap` (comma-separated) |
| `OPENAPI_ENABLED` / `OPENAPI_UI_ENABLED` | Set `false` for hardened production edge |
| `CORS_ALLOWED_ORIGINS` | Must include `PUBLIC_BASE_URL` |

**On-prem intelligence (automatic in compose):**

- `Lotris__DeploymentMode=OnPrem`
- `Lotris__DisablePaymentGates=true` — all AI features unlocked, no SaaS billing gates
- `Intelligence__QdrantUrl=http://qdrant:6333`

**Analytics ETL bounds** (sysadmin can tune further in `/ops`):

- `ANALYTICS_MIN_ROLLUP_MINUTES` / `MAX` — rollup interval bounds
- `ANALYTICS_MANUAL_COOLDOWN` — seconds between manual "Run now" (default 60)

---

## 5. Authentication

Hybrid model — enable per deployment:

| Provider | Config | Use case |
|----------|--------|----------|
| **Identity** | `NEXT_PUBLIC_AUTH_PROVIDERS=identity` | Local accounts (default on-prem) |
| **Entra ID** | `ENTRA_ENABLED`, client ID/secret, tenant | Microsoft SSO — see [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md) |
| **LDAP/AD** | `Auth:Providers:Ldap:Enabled` | Directory bind (architecture ready; customer-specific) |

All successful logins issue a **Lotris JWT** (`Authorization: Bearer …`) with `sub`, `tenant_id`, and role claims.

**Service accounts:** Use admin-created users; no separate machine-to-machine OAuth in v1.

---

## 6. Data architecture

### 6.1 MSSQL schemas

| Schema | Contents |
|--------|----------|
| `dbo` | Operational — tickets, users, teams, KPIs, intelligence config, RCA |
| `analytics` | Rollup tables, KPI trends, workload snapshots |
| Hangfire | Job storage (same MSSQL instance) |

Migrations applied on startup when `DATABASE_APPLY_LEGACY_MIGRATIONS=true` (SQL scripts in `packages/db/migrations/mssql/`) plus EF Core migrations in `src/Lotris.Infrastructure/Migrations/`.

### 6.2 Redis

- Auto-assign mutex (prevent double claim)
- Analytics manual-run cooldown
- SSE pub/sub for notifications and health

### 6.3 Qdrant

- Collection per tenant for knowledge embeddings
- **Not required for uptime** — API falls back to keyword/SQL search if Qdrant is down

### 6.4 Backup recommendations

| Component | Recommendation |
|-----------|----------------|
| MSSQL | Daily full backup + transaction log backup if RPO < 24h; test restore quarterly |
| Redis | Ephemeral cache acceptable; mutex state is short-lived |
| Qdrant | Rebuild from knowledge index if lost; backup volume if RAG SLA is strict |
| Env secrets | Store in vault; never commit `deploy/.env.onprem` |

---

## 7. Background jobs (Hangfire)

Jobs run inside the API process (Hangfire server in `Lotris.Api`).

| Job family | Purpose |
|------------|---------|
| SLA / escalation | Pickup and resolution timers |
| Auto-assign | Least-loaded assignment on breach |
| Analytics rollup | Incremental MSSQL analytics (default ~5 min, configurable) |
| Report generation | Scheduled PDF/Excel + email delivery |
| Report schedule runner | Cron-based schedule execution |
| Recurring incident digest | Periodic summary email job |
| IMAP intake | Email-to-ticket poller (when configured) |
| Closed ticket indexer | Knowledge ingest on close (tenant toggle) |

**Ops UI:** `/ops` → Analytics & ETL Jobs — view status, adjust intervals, trigger manual run (60s cooldown).

**Hangfire dashboard:** Available in Development only (`/hangfire`). Not exposed in production compose by default.

---

## 8. Intelligence / AI

Configured by tenant admin at `/admin/intelligence`.

| Feature | Requirement |
|---------|-------------|
| Knowledge Q&A | At least one chat-capable provider |
| Semantic search | Qdrant + embedding provider (OpenAI/Azure) |
| RCA AI suggest | Chat provider + knowledge articles |
| Report narratives | Chat provider (skipped gracefully if unavailable) |
| Copilot / Entra | Customer Azure app registration — [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md) |
| Teams alerts | Webhook URL in intelligence settings |

**On-prem:** No Stripe or feature paywalls — all toggles available when `DisablePaymentGates=true`.

**Air-gap note:** No bundled offline LLM. Customer must provide API keys or Azure OpenAI in their network.

---

## 9. Security considerations

| Topic | Guidance |
|-------|----------|
| **TLS** | Terminate at nginx or upstream load balancer; set `PUBLIC_BASE_URL` to `https://…` |
| **Secrets** | Rotate `JWT_SECRET`, DB passwords, Redis password at install; use strong values |
| **OpenAPI UI** | Set `OPENAPI_UI_ENABLED=false` on internet-facing deployments |
| **CORS** | Restrict to known origins |
| **RBAC** | Review admin accounts; use least privilege |
| **Monitor wall** | Public unauthenticated — network-segment if sensitive |
| **Audit** | Admin actions logged — `/admin` audit log |
| **Multi-tenancy** | Single-tenant typical for on-prem; multi-tenant supported in schema |

---

## 10. Operations runbook

### 10.1 Health checks

```bash
curl -s http://localhost:9090/health
curl -s http://localhost:9090/health/ready
```

Readiness verifies MSSQL and Redis connectivity.

### 10.2 Restart services

`/ops` restart buttons are **audit-only** — they do not restart containers.

```bash
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem restart api web
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem restart qdrant
```

Full stack recycle:

```bash
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem down
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem up -d
```

### 10.3 Logs

```bash
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem logs -f api
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem logs -f web
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem logs -f mssql
```

### 10.4 Smoke test (post-change)

```bash
bash scripts/onprem-smoke.sh
```

Validates health, login, and analytics jobs API (9 checks).

### 10.5 Upgrade procedure

1. Backup MSSQL
2. Pull new image/tag or rebuild from release branch `main`
3. `docker compose … up -d --build`
4. Watch API logs for migration completion
5. Run smoke test
6. Spot-check `/ops` and login

---

## 11. API and integration

| Resource | Location |
|----------|----------|
| OpenAPI spec (committed) | `docs/openapi/v1.json` — 130 operations |
| Human index | [API.md](API.md) |
| Interactive docs | `/openapi` (Scalar) when enabled |
| Public intake | `POST /api/v1/request` |
| Public monitor stats | `GET /api/v1/monitor/stats` |

**Auth for integrations:** `POST /api/v1/auth/login` → use JWT on subsequent calls.

After API changes in development: `pnpm api:sync` refreshes spec and docs.

---

## 12. Known limitations

| Item | Detail |
|------|--------|
| Ops restart | No one-click Docker restart from UI |
| Store health endpoints | Stubbed (`/health/store`) — not used on on-prem deployments |
| Load testing | No formal load test report; integration gates pass |
| SaaS billing UI | Not included in on-prem build |
| Offline LLM | Not supported |

---

## 13. Support information

| Need | Where to look |
|------|---------------|
| Abbreviations (SSE, JWT, ETL, …) | [GLOSSARY.md](GLOSSARY.md) |
| Install | [deploy/INSTALL.md](../deploy/INSTALL.md) |
| Business scope | [BRD.md](BRD.md) |
| Entra / Copilot | [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md) |
| Scripts & gates | [TOOLS.md](TOOLS.md) |
| Repository | [github.com/kayzredman/lotrisC](https://github.com/kayzredman/lotrisC.git) |

**Verification suite (for release QA):**

```bash
cd src && dotnet test
pnpm smoke:phase5
pnpm gate:etl
pnpm onprem:smoke
```

---

## 14. Handover checklist

| # | Task | Owner | Done |
|---|------|-------|------|
| 1 | Production `.env` configured with strong secrets | IT | ☐ |
| 2 | TLS certificate installed on proxy | IT | ☐ |
| 3 | MSSQL backup job scheduled | DBA | ☐ |
| 4 | SMTP configured for notifications/reports | IT | ☐ |
| 5 | Admin account created via bootstrap | IT | ☐ |
| 6 | Smoke test passed on production URL | IT | ☐ |
| 7 | Entra app registered (if using Microsoft SSO) | Identity team | ☐ |
| 8 | AI provider keys stored securely (if using intelligence) | IT | ☐ |
| 9 | OpenAPI UI disabled on public edge (if required) | Security | ☐ |
| 10 | Monitor wall network access reviewed | Security | ☐ |
| 11 | Runbook shared with on-call team | IT | ☐ |
| 12 | BRD signed off by product owner | Business | ☐ |

---

_Lotris IT Handover v1.0 — July 2026._
