# OpenAPI spec

| File | Purpose |
|------|---------|
| [`v1.json`](v1.json) | Committed snapshot — **98 operations / 78 paths** (July 2026, incl. P1 parity) |

**Refresh:**

```bash
./scripts/export-openapi.sh   # API must be running on :5153
python3 scripts/generate-api-docs.py
pnpm --filter @lotris/web api:codegen
```

**Browse live:** [Scalar UI](http://localhost:5153/openapi) when the API is running.
