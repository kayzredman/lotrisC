# Lotris Helm chart

Minimal Kubernetes packaging for **API + web**. MSSQL and Redis must be provisioned separately (managed service or in-cluster operator).

## Install

Build and push images first (from repo root):

```bash
docker build -t lotris/api:latest -f src/Lotris.Api/Dockerfile src
docker build -t lotris/web:latest -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://lotris.yourcompany.local \
  --build-arg NEXT_PUBLIC_AUTH_PROVIDERS=identity .
```

Create a values override with connection strings and secrets, then:

```bash
helm upgrade --install lotris docker/helm/lotris \
  -f my-values.yaml
```

## Required values

```yaml
api:
  connectionString: "Server=...;Database=lotris;User Id=...;Password=...;TrustServerCertificate=True"
  redisConnectionString: "redis:6379,password=...,abortConnect=false"
  jwtSecret: "your-secret-at-least-32-characters-long"

web:
  publicApiUrl: "https://lotris.yourcompany.local"
```

Run bootstrap after first deploy (port-forward or ingress):

```bash
LOTRIS_BASE_URL=https://lotris.yourcompany.local bash deploy/scripts/bootstrap.sh
```

## Scope

This chart does **not** include:

- MSSQL / Redis StatefulSets (use platform-managed DBs)
- TLS certificate automation
- Real service restart wiring (deferred — see `docs/TOOLS.md`)

For all-in-one demos, prefer `docker/docker-compose.onprem.yml` — see [deploy/INSTALL.md](../../../deploy/INSTALL.md).
