# Lotris C# Backend

ASP.NET Core 10 solution for the Lotris backend refactor (Phase 0 scaffold).

## Projects

| Project | Purpose |
|---------|---------|
| `Lotris.Api` | REST API, OpenAPI, health checks, Hangfire dashboard (dev) |
| `Lotris.Application` | Interfaces and options (analytics, auth) |
| `Lotris.Domain` | Domain enums and primitives |
| `Lotris.Contracts` | DTOs shared with clients |
| `Lotris.Infrastructure` | EF Core, Identity, JWT, analytics stubs |
| `Lotris.Workers` | Hangfire registration (jobs in Phase 4+) |

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

Refresh the committed spec after API changes:

```bash
pnpm api:sync   # from repo root — export spec, update docs/API.md, regenerate TS types
```

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
