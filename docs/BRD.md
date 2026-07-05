# Lotris — Business Requirements Document (BRD)

> **Document type:** As-built business requirements  
> **Version:** 1.0  
> **Date:** July 2026  
> **Status:** Delivered — production-ready; on-prem validated  
> **Repository:** [github.com/kayzredman/lotrisC](https://github.com/kayzredman/lotrisC.git) (July 2026 release)  
> **Audience:** Product owners, programme sponsors, IT operations, customer success

---

## 1. Executive summary

**Lotris** is a multi-tenant IT Help Desk and KPI Management platform for support teams. It covers ticket lifecycle management, team queues, SLA enforcement, KPI tracking, operational reporting, system health monitoring, and an intelligence layer for knowledge search, AI-assisted root cause analysis (RCA), and scheduled analytics.

This document describes **the capabilities delivered and accepted** for production use, including on-premises deployment. It is the reference for business stakeholders and for internal teams who install, operate, and support the platform.

**Business outcome:** IT support organisations run one system for day-to-day ticket operations, performance management, and management reporting — on customer infrastructure, with optional cloud AI providers where permitted.

---

## 2. Business objectives

| # | Objective | Success measure |
|---|-----------|-----------------|
| BO-1 | Reduce ticket handling friction | Queue-based pickup, auto-assign on SLA breach, batch reassignment |
| BO-2 | Improve SLA compliance visibility | Real-time SLA warnings, escalation, audit trail |
| BO-3 | Align engineer performance to targets | Three-layer KPI model (definitions → assignments → agreements) |
| BO-4 | Automate operational reporting | Scheduled and on-demand PDF/Excel reports with optional email delivery |
| BO-5 | Enable enterprise deployment | Docker on-prem stack, hybrid auth, no mandatory cloud identity |
| BO-6 | Accelerate incident resolution | Knowledge base, semantic search, AI-assisted RCA, problem management |
| BO-7 | Provide IT operations visibility | SysAdmin health dashboard, public monitor wall, analytics ETL controls |

---

## 3. Scope

### 3.1 In scope (delivered)

| Domain | Capability |
|--------|------------|
| **Authentication** | Email/password (ASP.NET Identity), optional Entra ID OIDC, LDAP-ready architecture |
| **Multi-tenancy** | Isolated tenants; all queries scoped by `tenantId` |
| **Tickets** | Full FSM lifecycle, comments, attachments, history, batch reassignment |
| **Queue** | Team queues, claim, config, health, auto-assign mutex |
| **Tasks** | Non-ticket work items with checklist and assignees |
| **KPIs** | Definitions, assignments, agreements, scoring, import, team targets |
| **Dashboard** | Summary, queue health, engineer performance, ticket analytics |
| **Analytics** | SLA warnings, KPI trends, team workload + rebalance suggestions |
| **Reports** | Generate, schedule, download; email delivery to recipients |
| **Intake** | Public web form, category routing, email (IMAP) poller |
| **Onboarding** | 5-step wizard or bootstrap skip for production install |
| **Admin** | Users, teams, routing, team access grants, role management |
| **Notifications** | Email + in-app SSE stream |
| **Audit** | Admin audit log |
| **System health** | Live snapshot, SSE, incidents; Analytics & ETL jobs panel |
| **Monitor wall** | Public unauthenticated ops display |
| **Intelligence** | AI provider setup, knowledge Q&A, semantic search (Qdrant), RCA wizard with approvals, problems register |
| **On-prem** | Full Docker Compose stack, bootstrap, smoke tests, all intelligence features unlocked |
| **API contract** | OpenAPI 3.1 — 130 operations; Scalar interactive docs |

### 3.2 Deferred (post-release backlog)

| Item | Notes |
|------|-------|
| API break-glass `/health/console` | Optional ops fallback |
| Formal load/performance test report | Integration + gate scripts pass; optional enterprise load test |
| All auth providers validated in single Compose matrix | Identity proven; Entra/LDAP per customer config |

---

## 4. Stakeholders and roles

| Role | Primary use |
|------|-------------|
| **Engineer** | Queue, tickets, tasks, personal KPI agreement |
| **Team Lead** | Queue oversight, batch assign, team KPI, RCA participation |
| **IT Manager** | KPI definitions, dashboard, reports, workload balancing |
| **Admin / Superadmin** | Users, teams, routing, intelligence setup, analytics jobs |
| **SysAdmin / Platform** | `/ops` health, ETL job tuning, Docker host management |
| **Executive / NOC** | Monitor wall, scheduled reports |
| **External requester** | Public ticket intake (no login) |

**RBAC model:** Role claims on JWT (`ENGINEER`, `TEAM_LEAD`, `IT_MANAGER`, `ADMIN`, `SUPERADMIN`) with controller-level enforcement.

---

## 5. Functional requirements (as-built)

### 5.1 Ticket management

| ID | Requirement | Status |
|----|-------------|--------|
| FR-T-01 | Ticket lifecycle FSM: NEW → … → CLOSED with valid transitions only | ✅ |
| FR-T-02 | Team routing and queue assignment | ✅ |
| FR-T-03 | Engineer claim from queue with workload limits | ✅ |
| FR-T-04 | Auto-assign least-loaded engineer on pickup SLA breach | ✅ |
| FR-T-05 | Comments, attachments, full history audit | ✅ |
| FR-T-06 | Direct assign / batch reassignment (lead+) | ✅ |
| FR-T-07 | Similar incidents in ticket drawer | ✅ |
| FR-T-08 | Auto-index closed tickets to knowledge (tenant toggle) | ✅ |

### 5.2 Queue and SLA

| ID | Requirement | Status |
|----|-------------|--------|
| FR-Q-01 | Per-team queue visibility scoped by role | ✅ |
| FR-Q-02 | Configurable pickup and resolution SLA | ✅ |
| FR-Q-03 | SLA breach notifications and escalation | ✅ |
| FR-Q-04 | SLA warning analytics endpoint | ✅ |
| FR-Q-05 | Redis-backed auto-assign mutex (no double-assign) | ✅ |

### 5.3 KPI management

| ID | Requirement | Status |
|----|-------------|--------|
| FR-K-01 | Layer 1: IT Manager defines global KPI definitions | ✅ |
| FR-K-02 | Layer 2: Team Lead assigns targets to engineers | ✅ |
| FR-K-03 | Layer 3: KPI Agreement with areas, weights, digital sign-off | ✅ |
| FR-K-04 | Excel/CSV import for agreements | ✅ |
| FR-K-05 | KPI trend analytics (team and personal) | ✅ |
| FR-K-06 | Engineer "My Agreement" view and submit-for-review | ✅ |

### 5.4 Reporting and analytics

| ID | Requirement | Status |
|----|-------------|--------|
| FR-R-01 | On-demand report generation (PDF/Excel) | ✅ |
| FR-R-02 | Scheduled reports via Hangfire | ✅ |
| FR-R-03 | Email delivery to configured recipients | ✅ |
| FR-R-04 | AI narrative summaries when chat provider configured | ✅ |
| FR-R-05 | MSSQL analytics schema with incremental rollup (configurable interval) | ✅ |
| FR-R-06 | Sysadmin ETL job config, status, manual run with cooldown | ✅ |
| FR-R-07 | Recurring incident digest job | ✅ |

### 5.5 Administration and onboarding

| ID | Requirement | Status |
|----|-------------|--------|
| FR-A-01 | User invite, edit, role change, deactivate | ✅ |
| FR-A-02 | Team CRUD and team access grants | ✅ |
| FR-A-03 | Category routing for intake | ✅ |
| FR-A-04 | Onboarding wizard (5 steps) or bootstrap skip | ✅ |
| FR-A-05 | Audit log for admin actions | ✅ |

### 5.6 Intake and public surfaces

| ID | Requirement | Status |
|----|-------------|--------|
| FR-I-01 | Public ticket request form | ✅ |
| FR-I-02 | Email-to-ticket (IMAP) with routing | ✅ |
| FR-I-03 | Public monitor wall with live stats | ✅ |
| FR-I-04 | ACK and resolution emails to external requesters | ✅ |

### 5.7 Intelligence platform

| ID | Requirement | Status |
|----|-------------|--------|
| FR-IN-01 | Admin connects AI providers (OpenAI, Claude, Azure/Copilot, etc.) | ✅ |
| FR-IN-02 | Tenant feature toggles (RCA suggest, knowledge Q&A, report narratives, Teams webhook) | ✅ |
| FR-IN-03 | Knowledge base ingest and Ask Knowledge Base Q&A | ✅ |
| FR-IN-04 | Semantic search via Qdrant with keyword/SQL fallback | ✅ |
| FR-IN-05 | Problems register linked to recurring incidents | ✅ |
| FR-IN-06 | RCA wizard: draft → review → approve → publish | ✅ |
| FR-IN-07 | AI suggest on RCA with knowledge fallback | ✅ |
| FR-IN-08 | On-prem: all intelligence features unlocked (no payment gates) | ✅ |
| FR-IN-09 | Optional Microsoft Entra sign-in and Copilot (customer-configured) | ✅ |

### 5.8 Operations and health

| ID | Requirement | Status |
|----|-------------|--------|
| FR-O-01 | Liveness and readiness probes | ✅ |
| FR-O-02 | Admin health snapshot + SSE stream | ✅ |
| FR-O-03 | Service status including Redis, MSSQL, Qdrant (when configured) | ✅ |
| FR-O-04 | Analytics & ETL Jobs panel on `/ops` | ✅ |
| FR-O-05 | In-app notification SSE | ✅ |

---

## 6. Non-functional requirements

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-01 | Multi-tenant data isolation | No cross-tenant reads/writes | ✅ Tested |
| NFR-02 | API contract stability | OpenAPI 3.1 committed spec | ✅ 130 ops |
| NFR-03 | On-prem single-host deploy | Docker Compose, 8 GB RAM min | ✅ Validated |
| NFR-04 | Graceful degradation | API starts if Qdrant unavailable | ✅ |
| NFR-05 | Background jobs | Hangfire on MSSQL | ✅ |
| NFR-06 | Real-time updates | SSE for notifications and health | ✅ |
| NFR-07 | Security | JWT auth; secrets via env; OpenAPI UI disable in hardened prod | ✅ |
| NFR-08 | Observability | Health endpoints, structured ops UI | ✅ |

---

## 7. User journeys (acceptance scenarios)

| Journey | Steps | Acceptance |
|---------|-------|------------|
| **Daily engineer** | Login → queue → claim ticket → work → resolve → close | Ticket FSM and notifications work |
| **Team lead** | Review workload → batch reassign → monitor SLA warnings | Analytics and queue tools available |
| **IT manager** | Define KPI → assign → run report → schedule email | KPI + reports end-to-end |
| **Admin install** | Configure `.env` → Compose up → bootstrap → smoke | `pnpm onprem:smoke` 9/9 |
| **Intelligence admin** | Connect provider → ingest knowledge → ask question | Q&A returns grounded answer |
| **RCA owner** | Create problem → RCA wizard → submit → approve → publish | Approval pipeline enforced |
| **NOC** | Open `/monitor` on wall display | No auth; live stats |

---

## 8. Release validation (evidence)

| Gate | Command / artefact | Result (July 2026) |
|------|-------------------|---------------------|
| Integration tests | `cd src && dotnet test` | ✅ Pass |
| REST smoke | `pnpm smoke:phase5` | ✅ 29 checks |
| Queue / SLA gate | `pnpm gate:queue` | ✅ |
| SSE gate | `pnpm gate:sse` | ✅ |
| ETL gate | `pnpm gate:etl` | ✅ 7 checks |
| On-prem smoke | `pnpm onprem:smoke` (clean rebuild) | ✅ 9 checks incl. analytics |
| OpenAPI sync | `pnpm api:sync` | ✅ 130 operations |

---

## 9. Dependencies and assumptions

| Dependency | Assumption |
|------------|------------|
| **MSSQL** | Primary operational and analytics store; customer provides backup strategy |
| **Redis** | Required for cache, mutex, cooldown; co-located or managed instance |
| **Qdrant** | Optional but recommended for semantic search; bundled in on-prem compose |
| **AI providers** | Customer supplies API keys or Azure OpenAI for intelligence features |
| **Email** | SMTP configured for notifications and report delivery |
| **TLS / DNS** | Customer terminates TLS at reverse proxy for production URLs |
| **Entra ID** | Optional; customer registers app in their tenant |

---

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| MSSQL slow first boot | Install appears stuck | Document 2–4 min wait; health probes |
| Qdrant down | Semantic search degraded | Keyword/SQL fallback; API still starts |
| AI provider misconfiguration | Intelligence features unavailable | Test connection in admin UI; graceful skip on reports |
| No SMTP | No email notifications/reports | In-app SSE still works; ops alert on config |

---

## 11. Related documents

| Document | Purpose |
|----------|---------|
| [GLOSSARY.md](GLOSSARY.md) | Abbreviations & terms (SSE, SLA, JWT, etc.) |
| [IT-HANDOVER.md](IT-HANDOVER.md) | CIO / IT team — install, operations, security |
| [deploy/INSTALL.md](../deploy/INSTALL.md) | On-prem installation |
| [API.md](API.md) | REST API reference |
| [INTELLIGENCE-ENTERPRISE-SETUP.md](INTELLIGENCE-ENTERPRISE-SETUP.md) | Entra ID, Copilot, and enterprise AI setup |
| [TOOLS.md](TOOLS.md) | Operations scripts and verification gates |

---

## 12. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product owner | | | |
| QA / Tech lead | | | |
| Customer IT sponsor | | | |

---

_Lotris BRD v1.0 — July 2026. As-built business requirements for production delivery and ongoing support._
