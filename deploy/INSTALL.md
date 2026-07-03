# Lotris on-prem install guide

Install the full Lotris stack on a single host with Docker Compose: **MSSQL + Redis + C# API + Next.js web + nginx**.

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- 8 GB RAM minimum (MSSQL is memory-heavy)
- Ports **80** available (or set `LOTRIS_HTTP_PORT` in env)

## 1. Configure environment

```bash
cp deploy/.env.onprem.example deploy/.env.onprem
```

Edit `deploy/.env.onprem`:

| Variable | Action |
|----------|--------|
| `MSSQL_SA_PASSWORD` | Strong password |
| `JWT_SECRET` | Random string, **≥ 32 chars** |
| `REDIS_PASSWORD` | Strong password |
| `LOTRIS_ADMIN_PASSWORD` | First admin password |
| `PUBLIC_BASE_URL` | Browser URL (e.g. `http://lotris.yourcompany.local`) |
| `LOTRIS_SKIP_ONBOARDING` | `true` = production install; `false` = demo wizard |

## 2. Start the stack

From repo root:

```bash
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem up -d --build
```

First boot applies EF + legacy MSSQL migrations and seeds analytics job config (2–4 minutes).

Watch logs:

```bash
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem logs -f api
```

## 3. Bootstrap admin (Track A)

After services are healthy:

```bash
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem --profile bootstrap run --rm bootstrap
```

This creates the admin user, default team, SLA defaults, and optionally marks onboarding complete.

## 4. Verify

```bash
bash scripts/onprem-smoke.sh
```

Open in browser:

- **App:** `http://localhost/` (or your `PUBLIC_BASE_URL`)
- **Ops:** `/ops`
- **API health:** `/health`
- **OpenAPI:** `/openapi`

Sign in with `LOTRIS_ADMIN_EMAIL` / `LOTRIS_ADMIN_PASSWORD` from your env file.

## Tracks

| Track | `LOTRIS_SKIP_ONBOARDING` | Result |
|-------|--------------------------|--------|
| **A — Production** | `true` | Bootstrap seeds everything; admin goes straight to dashboard |
| **B — Demo / eval** | `false` | First admin completes the 5-step onboarding wizard |

## Stop / reset

```bash
# Stop
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem down

# Stop and delete volumes (fresh DB)
docker compose -f docker/docker-compose.onprem.yml --env-file deploy/.env.onprem down -v
```

## Kubernetes (optional)

A minimal Helm chart lives at `docker/helm/lotris/`. It deploys API + web against **external** MSSQL and Redis — use Compose for all-in-one demos, Helm when an platform team manages data stores separately.

See `docker/helm/lotris/README.md`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| API stuck starting | MSSQL still initializing — wait 2–3 min; check `docker logs lotris_onprem_mssql` |
| Web 502 via proxy | `docker logs lotris_onprem_web` — rebuild after config change |
| CORS errors | Set `CORS_ALLOWED_ORIGINS` to match `PUBLIC_BASE_URL` exactly |
| Bootstrap “register failed” | Admin may already exist — try login with same credentials |

Service restart from `/ops` is **audit-only** until post–Phase 6 restart wiring lands. Use `docker compose … restart api web` manually.
