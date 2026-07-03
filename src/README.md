# Lotris C# Backend

ASP.NET Core 10 solution for the Lotris backend refactor (Phases 0–6 complete; Phase 7 parity gate in progress).

## Projects

| Project | Purpose |
|---------|---------|
| `Lotris.Api` | REST API (17 controllers), OpenAPI, health checks, Hangfire dashboard (dev) |
| `Lotris.Application` | Services, interfaces (tickets, analytics, admin, …) |
| `Lotris.Domain` | Domain enums and primitives |
| `Lotris.Contracts` | DTOs shared with clients |
| `Lotris.Infrastructure` | EF Core, Dapper repos, Identity, JWT, analytics ETL |
| `Lotris.Workers` | Hangfire job registration |

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- Docker (for MSSQL + Redis via repo root compose)

## Local run

1. Start infrastructure:

```bash
docker compose -f docker/docker-compose.yml up -d mssql redis
```

2. Apply EF migrations (first time):

```bash
cd src
dotnet ef database update --project Lotris.Infrastructure --startup-project Lotris.Api
```

3. Run the API:

```bash
cd src
dotnet run --project Lotris.Api
```

- OpenAPI JSON: `/openapi/v1.json`
- Scalar UI: `/openapi`
- Human index: [`docs/API.md`](../docs/API.md)
- Liveness: `GET /health`
- Readiness: `GET /health/ready`
- Auth: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
- Public monitor: `GET /api/v1/monitor/stats`

Refresh the committed spec after API changes:

```bash
pnpm api:sync   # from repo root — export spec, update docs/API.md, regenerate TS types
```

## Phase 7 parity

See [`docs/PARITY-AUDIT.md`](../docs/PARITY-AUDIT.md) and [`docs/REFACTOR.md`](../docs/REFACTOR.md). Key July 2026 endpoints:

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/v1/monitor/stats` | Public | NOC monitor wall |
| `GET /api/v1/analytics/team-workload?teamId=` | TEAM_LEAD+ | Workload + suggestions |
| `POST /api/v1/tickets/batch-reassign` | TEAM_LEAD+ | Apply rebalancing (max 20) |

## Configuration

| Setting | Env override | Notes |
|---------|--------------|-------|
| `ConnectionStrings:DefaultConnection` | — | MSSQL (operational + analytics + Hangfire) |
| `Jwt:Secret` | `JWT_SECRET` | JWT signing key (min 32 chars recommended) |
| `Database:ApplyLegacyMigrations` | — | When `true`, applies `packages/db/migrations/mssql/*.sql` |
| `Redis:ConnectionString` | — | Used for health checks and future cache |
| `OpenApi:Enabled` | — | Serve `/openapi/v1.json` (default `true`; off in Testing) |
| `OpenApi:UiEnabled` | — | Serve Scalar UI at `/openapi` (default `true`) |

## Docker (optional API container)

```bash
docker compose -f docker/docker-compose.yml up -d api-csharp
```

## EF migrations

Add a migration after entity changes:

```bash
cd src
dotnet ef migrations add <Name> --project Lotris.Infrastructure --startup-project Lotris.Api
```

## Build

```bash
cd src
dotnet build
```
