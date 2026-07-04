# Lotris C# Backend

ASP.NET Core solution for the Lotris backend (Phases 0–7 complete; Phase 8 intelligence platform shipped).

## Projects

| Project | Purpose |
|---------|---------|
| `Lotris.Api` | REST API (17+ controllers), OpenAPI, health checks, Hangfire dashboard (dev) |
| `Lotris.Application` | Services, interfaces (tickets, analytics, intelligence, RCA, …) |
| `Lotris.Domain` | Domain enums and primitives |
| `Lotris.Contracts` | DTOs shared with clients |
| `Lotris.Infrastructure` | EF Core, Dapper repos, Identity, JWT, Qdrant, analytics ETL |
| `Lotris.Workers` | Hangfire job registration |

## Prerequisites

- [.NET SDK](https://dotnet.microsoft.com/download) (repo targets .NET 9+)
- Docker (MSSQL + Redis + optional Qdrant via repo root compose)

## Local run

1. Start infrastructure (or use `pnpm api:restart` from repo root):

```bash
docker compose -f docker/docker-compose.yml up -d mssql redis qdrant
```

2. Run the API:

```bash
pnpm api:restart          # from repo root — recommended
# or foreground:
cd src/Lotris.Api && dotnet run --urls http://localhost:5153
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

## Phase 8 intelligence

See [`docs/PHASE-8-UPDATES.md`](../docs/PHASE-8-UPDATES.md) and [`docs/INTELLIGENCE-DEV-SETUP.md`](../docs/INTELLIGENCE-DEV-SETUP.md).

| Feature | Notes |
|---------|-------|
| Qdrant RAG | `Intelligence:QdrantUrl` — optional; keyword fallback if down |
| On-prem unlock | `Lotris:DisablePaymentGates=true` bypasses feature flags |
| RCA approvals | Migration `0015_rca_approvals.sql` |

## Configuration

| Setting | Env override | Notes |
|---------|--------------|-------|
| `ConnectionStrings:DefaultConnection` | — | MSSQL (operational + analytics + Hangfire) |
| `Jwt:Secret` | `JWT_SECRET` | JWT signing key (min 32 chars recommended) |
| `Database:ApplyLegacyMigrations` | — | When `true`, applies `packages/db/migrations/mssql/*.sql` |
| `Redis:ConnectionString` | — | Health checks, cooldown, cache |
| `Intelligence:QdrantUrl` | — | Vector sidecar (dev: `http://localhost:6333`) |
| `Lotris:DisablePaymentGates` | `Lotris__DisablePaymentGates` | On-prem: unlock all intelligence features |
| `OpenApi:Enabled` | — | Serve `/openapi/v1.json` |
| `OpenApi:UiEnabled` | — | Serve Scalar UI at `/openapi` |

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

## Build & test

```bash
cd src
dotnet build
dotnet test
```
