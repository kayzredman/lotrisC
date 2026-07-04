# Phase 8 — Implementation updates (July 2026)

> **Branch:** `dev` @ `45dc74c` (pushed to `origin/dev`)  
> **Tenant (dev):** Lotris Digital Setup — `701fc546-342b-4b80-82e1-24b152044161`  
> **Companion:** [PHASE-8-RESEARCH.md](PHASE-8-RESEARCH.md), [INTELLIGENCE-DEV-SETUP.md](INTELLIGENCE-DEV-SETUP.md), [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md)

This document captures what was built and fixed in the latest Phase 8 iteration: Intelligence & AI Setup, Knowledge Base, Reports UX, RCA fixes, and dev seed data.

---

## 1. Intelligence and AI Setup

**Page:** `/admin/intelligence` (sidebar: **Intelligence and AI Setup**)

### Providers

| Provider | Auth | Notes |
|----------|------|-------|
| Claude | API key | Anthropic |
| Cursor | Email + `crsr_` API key | Validates account; chat requires OpenAI key or separate ChatGPT/OpenAI provider |
| ChatGPT | OpenAI API key | |
| Copilot | Microsoft sign-in (Entra) | Official Copilot SVG icon; needs Azure OpenAI for chat |
| OpenAI | API key | Direct API |

### API

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/v1/admin/intelligence/ai-providers` | Provider list + hints |
| `POST` | `/api/v1/admin/intelligence/connect-provider` | Connect Claude/Cursor/ChatGPT/OpenAI |
| `GET` | `/api/v1/admin/intelligence/microsoft/login` | Entra OAuth (API) |
| `POST` | `/api/v1/admin/intelligence/test-connection` | Validate credentials |
| `GET/PATCH` | `/api/v1/admin/intelligence/config` | Feature toggles |

**Migration:** `packages/db/migrations/mssql/0012_ai_provider_credentials.sql` — adds `ai_username`, `ai_connected_at`, `ai_connected_by_id` to `Tenant_Intelligence_Config`.

### Features (tenant toggles)

- RCA AI suggest (wizard)
- Knowledge Q&A (Ask Knowledge Base)
- Report narrative summaries (skipped gracefully if provider cannot chat)
- Teams webhook alerts

### Local dev vs enterprise (July 2026)

- **Local Lotris dev:** [INTELLIGENCE-DEV-SETUP.md](INTELLIGENCE-DEV-SETUP.md) — ChatGPT/OpenAI API key via admin UI
- **Customer deploy:** [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md) — Entra + Copilot + Azure OpenAI
- UI: Standard providers (default) + collapsed Enterprise Copilot section; Cursor labeled verify-only

---

## 2. Knowledge Base

**Page:** `/knowledge`

### Ask Knowledge Base

- Card title and button: **Ask Knowledge Base**
- `POST /api/v1/intelligence/knowledge/query` — searches `knowledge.Knowledge_Articles` + chunks
- If connected provider cannot chat (e.g. Cursor `crsr_` key), returns retrieval-only excerpts with citations
- Empty state: publish RCAs to populate the knowledge index

### Known errors (KEDB)

- List from `dbo.Known_Errors` (created when RCAs are **published**)
- Separate from Ask Knowledge Base articles (those live in `knowledge.Knowledge_Articles`)

---

## 3. Problems & RCA

**Page:** `/problems` — list with filters (All, Overdue CAPA, Awaiting Review, Published)  
**Detail:** `/rca/{id}` — multi-step wizard (Incident → Root Cause → CAPA → Review)

### Fixes (July 2026)

- **RCA detail 500** — nullable `category_id` / `delegate_id` GUID parsing (`SqlGuid.FromSqlNullable`)
- **Problems list 500** — same nullable GUID issue on list mapping
- Wizard shows API error message when load fails (not generic “not found”)
- **AI suggest fallback** — knowledge retrieval when chat provider unavailable (Cursor `crsr_`)
- **Review step UX** — summary cards; footer actions (Submit / Publish / View in Knowledge)

### Auto-triggers

- P1 ticket close can auto-create RCA draft when `RCA_Trigger_Rules.auto_p1 = 1`
- Leads can create manually via **+ New Problem / RCA**

---

## 4. Reports

**Page:** `/reports`

### UX (July 2026)

- **Generate Now** polls job status every 2s until `DONE` or `FAILED`
- On success: closes generate panel, switches to **Report History**, highlights new row
- List auto-refreshes while any job is `PROCESSING`
- **Download** uses authenticated blob fetch (fixed server-side relative path → absolute path for `PhysicalFile`)
- Formats: **PDF**, **XLSX** only (CSV removed from UI — not supported by API)

### API

| Method | Route |
|--------|-------|
| `POST` | `/api/v1/reports/generate` → `202` + `jobId` |
| `GET` | `/api/v1/reports` |
| `GET` | `/api/v1/reports/{id}/status` |
| `GET` | `/api/v1/reports/{id}/download` |

**Requires:** Hangfire worker running inside API process. Output: `src/Lotris.Api/data/reports/{tenantId}/` (gitignored).

### Scheduled reports (July 2026)

- **Add Schedule** UI creates rows in `analytics.ReportSchedules` with `next_run_at`
- **`ReportScheduleRunnerJob`** — Hangfire recurring job every 15 minutes; enqueues report jobs for due active schedules
- **Schedule** button on generate panel opens the add-schedule form
- Email delivery to `recipients` — **not yet wired** (jobs generate files only)

---

## 5. Admin (teams & users)

- Team/user edit modals (`edit-team-modal`, `edit-user-modal`)
- Admin page client refactor
- API extensions in `AdminController` / `AdminService`

---

## 6. Microsoft Entra

- **Local Lotris dev:** [INTELLIGENCE-DEV-SETUP.md](INTELLIGENCE-DEV-SETUP.md) — ChatGPT/OpenAI via admin UI (no Entra)
- **Customer deployments:** [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md) — Entra + Copilot + Azure OpenAI

Platform hooks (for tenant IT):

- Login: **Sign in with Microsoft** on `/login` when `ENTRA_*` configured on deployment
- Intelligence: Copilot provider → Microsoft OAuth → reads `tid` from token
- Next.js proxy: `apps/web/app/api/intelligence/microsoft-login/route.ts`
- Staging stub: `POST /api/v1/admin/intelligence/connect-entra/dev` (Development only)

---

## 7. Dev seed scripts

Run against local MSSQL (`lotris` / `sa` / `Lotris@Dev2024!`) unless env overrides are set.

| Script | Command | Seeds |
|--------|---------|-------|
| Digital setup | `pnpm seed:digital` | Tenant, teams, users from `docs/TEAMLIST.xlsx`, demo tickets |
| Knowledge samples | `node scripts/seed-knowledge-samples.mjs` | 3 `Knowledge_Articles` + chunks (Ask Knowledge Base) |
| Problems demo | `node scripts/seed-problems-demo.mjs` | 3 problems + RCAs + 2 known errors |

Optional env: `TENANT_ID=701fc546-342b-4b80-82e1-24b152044161`

**Dev login:** `admin-loose@test.local` / `Test1234!` (Lotris Digital Setup)

---

## 8. Known limitations

| Area | Limitation |
|------|------------|
| Cursor provider | `crsr_` keys authenticate but do not support direct LLM chat — use ChatGPT/OpenAI for full AI answers |
| Copilot | Requires Entra + Azure OpenAI endpoint/deployments for chat and embeddings |
| Knowledge KEDB | Only populated when RCAs are **published** (not by knowledge sample script alone) |
| Report narratives | Skipped silently if AI provider cannot chat; PDF/Excel still generates |
| Scheduled report email | Jobs generate files; email to `recipients` not wired yet |
| Generated reports | `src/Lotris.Api/data/` — gitignored |

---

## 9. Verification checklist

```bash
# API + web running
curl -s http://localhost:5153/health/live
# Login
curl -s -X POST http://localhost:5153/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin-loose@test.local","password":"Test1234!"}'

# Problems (expect 3 items after seed-problems-demo)
# GET /api/v1/problems

# RCA detail (expect 200, not 500)
# GET /api/v1/rca/{rcaId}

# Knowledge query (expect citations after seed-knowledge-samples)
# POST /api/v1/intelligence/knowledge/query

# Report generate + download (expect DONE + PDF bytes)
# POST /api/v1/reports/generate → poll status → GET download
```

**UI smoke:**

1. `/problems` — click RCA title → wizard loads
2. `/knowledge` — Ask Knowledge Base: “database timeout”
3. `/reports` — Generate Now → auto-return to history → Download PDF
4. `/admin/intelligence` — provider cards, connect, test

---

## 10. Key files (quick index)

| Area | Paths |
|------|-------|
| Intelligence UI | `apps/web/components/admin/intelligence-admin-client.tsx` |
| Provider logos | `apps/web/components/brand/ai-provider-logos.tsx`, `apps/web/public/brand/providers/copilot.svg` |
| Knowledge UI | `apps/web/components/knowledge/knowledge-list.tsx` |
| Reports UI | `apps/web/components/reports/reports-layout.tsx` |
| RCA wizard | `apps/web/components/rca/rca-wizard.tsx` |
| Intelligence service | `src/Lotris.Application/Intelligence/IntelligenceService.cs` |
| Routed chat | `src/Lotris.Infrastructure/Intelligence/RoutedChatProvider.cs` |
| RCA repository | `src/Lotris.Infrastructure/ProblemManagement/DapperRcaRepository.cs` |
| Reports download | `src/Lotris.Api/Controllers/ReportsController.cs` |

---

_Phase 8 updates — July 2026._
