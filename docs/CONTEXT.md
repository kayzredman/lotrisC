# Lotris — Project Context

> Last updated: May 2026 — Sprint 18 IN PROGRESS (Phase 2: SLA Breach Prediction + KPI Trend Analysis; branch `feature/sprint-18-intelligence`). Sprint 17 complete and merged to dev (`af06b9c`).

---

## 1. Product Overview

**Lotris** is a multi-tenant Help Desk Ticket and KPI Management System built for IT customer support teams. It combines real-time ticket tracking, team queue management, engineer workload balancing, KPI-driven performance tracking, and advanced reporting into a single admin platform — designed for speed, clarity, and daily support operations.

**Tagline:** _"Where performance surfaces."_
**Pronunciation:** _LOH-tris_
**Positioning:** Enterprise performance management for IT and operations teams.

---

## 2. Problem Statement

IT support teams operate under constant pressure:

- Tickets pile up with no structured queue or controlled ownership
- SLA breaches are discovered after the fact, not prevented
- Engineer workloads are unbalanced with no visibility into capacity
- KPI targets exist on spreadsheets with no real-time tracking
- Management reports are manually compiled, inconsistent, and delayed

Lotris solves this with a single system where every ticket is queued, assigned, escalated, and reported automatically — and every performance target is tracked in real time.

---

## 3. Core Pillars

| Pillar        | Purpose                                                                            |
| ------------- | ---------------------------------------------------------------------------------- |
| **Tickets**   | End-to-end ticket lifecycle — log, queue, assign, escalate, resolve, close         |
| **Queue**     | Team-based queue management with controlled pickup and auto-assignment fallback    |
| **KPIs**      | Structured metric tracking aligned to individual, team, and organisational targets |
| **Reporting** | Automated, scheduled, and on-demand performance reports                            |

---

## 4. Key Features

| Feature                         | Description                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Ticket Lifecycle Management     | Full lifecycle from open to close with complete audit trail                                                                                 |
| Queue Management                | Team queues, controlled ticket pickup, workload enforcement, SLA-driven ordering                                                            |
| Auto-Assignment                 | Least-loaded engineer assignment when tickets are not picked within SLA                                                                     |
| Task Management                 | Assign and track non-ticket work items per engineer; engineers can also self-log personal tasks for their own tracking and KPI contribution |
| KPI Dashboard                   | Real-time performance metrics per engineer, team, and organisation                                                                          |
| SLA Tracking                    | Pickup SLA and resolution SLA monitoring with automated escalation                                                                          |
| Automated Notifications         | Email and in-app alerts on SLA breach, escalation, and KPI deadline                                                                         |
| Engineer Workload Balancing     | Max workload enforcement, queue visibility, priority ordering                                                                               |
| Role-based Access Control       | Granular permissions for engineers, leads, managers, and executives                                                                         |
| Multi-Tenancy                   | Each organisation is an isolated tenant with its own SLA rules and KPI config                                                               |
| Quarterly & Operational Reports | Auto-compiled ticket, SLA, queue, and KPI reports for stakeholder distribution                                                              |
| Responsive Design + PWA         | Fully responsive across desktop, tablet, and mobile; installable as a Progressive Web App                                                   |
| System Health Monitoring        | Real-time SysAdmin ops dashboard; per-process status, queue depths, restart controls; public status page (`status.lotris.io`)               |
| Ticket Intake (Web Form + Email) | Public self-service request form (`/request`, no auth required); IMAP email poller; auto-routing via CategoryRouting config table; source tracking on all tickets (INTERNAL / SELF_SERVICE / EMAIL / API); ACK and resolved emails to external requesters |

---

## 5. Ticket Lifecycle

```
NEW → TEAM_ASSIGNED → UNASSIGNED → ASSIGNED → IN_PROGRESS → ESCALATED → RESOLVED → CLOSED
```

### Assignment Flow

**Phase 1 — Team Routing**

- Ticket is assigned to a Team queue
- No engineer assigned yet (status: `UNASSIGNED`)

**Phase 2 — Controlled Pickup**

- Engineers can claim tickets from the queue
- System enforces: max workload, queue visibility, priority ordering

**Phase 2b — Admin / Team Lead Direct Assign**

- `ADMIN`, `SUPERADMIN`, and `TEAM_LEAD` roles can directly assign any ticket to an engineer from the ticket detail drawer
- The system auto-walks the state machine: `NEW → TEAM_ASSIGNED → UNASSIGNED → ASSIGNED` — all intermediate steps fire their normal SLA timers, history entries, and notifications
- Re-assigning an already-`ASSIGNED` ticket is supported; triggers a fresh `TICKET_ASSIGNED` notification

**Phase 3 — Auto-Assignment (SLA fallback)**

- If ticket is not picked within Pickup SLA: system auto-assigns to least-loaded engineer
- Round-robin fallback if loads are equal

**Phase 4 — SLA Escalation**

- Pickup SLA breach → auto-assign + manager notification
- Resolution SLA breach → escalation + alerts

---

## 6. KPI System

Lotris structures KPI management across three layers, separating global configuration from team-level assignment and individual performance agreements.

---

### Layer 1 — KPI Definitions `(IT Manager → 06-kpi-setup)`

The IT Manager creates and manages KPI definitions globally for the organisation. Each definition specifies:

- **Name & description** — what is being measured
- **Metric type** — percentage, time (hrs/min), count, score
- **Target value** — threshold for green/amber/red
- **Direction** — higher is better or lower is better
- **Scope** — Org-wide, Team-level, or Individual (Engineer)
- **Weight** — contribution to composite KPI score (must total 100 across active definitions)
- **Status** — Active or Draft

The manager can also set per-team target overrides in a matrix view (e.g. one team has a tighter SLA target than another).

| KPI Definition          | Scope      | Default Target | Weight |
| ----------------------- | ---------- | -------------- | ------ |
| SLA Compliance Rate     | Team / Org | ≥ 95%          | 20%    |
| Pickup SLA Adherence    | Team       | ≥ 90%          | 15%    |
| First Response Time     | Team / Org | ≤ 2 hrs        | 15%    |
| Avg Resolution Time     | Team       | ≤ 4 hrs        | 15%    |
| Engineer Productivity   | Individual | ≥ 30 / month   | 20%    |
| CSAT Score              | Team       | ≥ 4.2 / 5.0    | 10%    |
| Recurring Incident Rate | Org        | ≤ 10%          | 5%     |
| Workload Distribution   | Team       | ≥ 75 score     | —      |

---

### Layer 2 — KPI Assignment `(Team Lead → 07-team-kpi-setup)`

Team Leads work within the active KPI definitions set by the Manager. For each review period they:

- **Assign** specific KPIs to each engineer in their team (not every engineer needs every KPI)
- **Override targets** per engineer where appropriate (e.g. senior engineer has a higher SLA target; junior has a lower productivity threshold)
- Override inputs show the team default as a reference and the individual override value is clearly flagged
- Any KPI not assigned to an engineer is excluded from their score calculation

This layer is scoped to the Team Lead’s own team. KPI definitions and global weights are read-only here.

---

### Layer 3 — KPI Agreement `(Team Lead + Engineer → 08-kpi-agreement)`

For each review period a Team Lead builds a formal **KPI Agreement** with an individual engineer — a structured performance contract that both parties sign off on before the period begins.

Agreements are organised into **KPI Areas**, each containing multiple **Metric Rows**:

| Column                               | Description                                                      |
| ------------------------------------ | ---------------------------------------------------------------- |
| Minimum Performance Metrics Standard | Full prose description of the expected standard                  |
| Weight                               | Numeric weight for this metric within the total (all must = 100) |
| Measurement Period                   | `DAILY`, `MONTHLY`, `QUARTERLY`, or `ANNUALLY` — configurable per row |
| Target / Score                       | Specific target value for the review period                      |

Example structure for a DB Engineer agreement (total weight = 100):

| KPI Area                 | Metrics | Weight |
| ------------------------ | ------- | ------ |
| Product Quality          | 8       | 50.0   |
| Professional Development | 3       | 30.0   |
| Customer Focus           | 2       | 20.0   |

**Entry modes:**

- **Manual entry** — Team Lead types or pastes in each metric row directly in the system
- **Document upload** — Upload an Excel/CSV file; the system parses columns with a mapping wizard and shows a preview before import

**Sign-off flow:**

1. Team Lead builds the agreement (status: `DRAFT`)
2. Lead uses "Send to member for review" button — status changes to `PENDING_REVIEW`
3. Engineer views their own agreement at `/kpis/my-agreement` and accepts ("Accept & Sign Off") — status changes to `ACTIVE`
4. Active agreements are the basis for KPI tracking and scoring throughout the period

**Role access to agreements:**
- `SUPERADMIN`, `ADMIN`, `IT_MANAGER`, `TEAM_LEAD` — full agreement builder at `/kpis/agreements` (controlled via `kpiAgreementProcedure`)
- `TEAM_LEAD`, `ENGINEER` — read-only My Agreement view at `/kpis/my-agreement`; engineer can accept `PENDING_REVIEW` agreements

---

### KPI Tracking & Scoring _(Phase 2)_

During the review period, actuals are logged against each metric. At the end of the period the system calculates a weighted score per KPI Area and an overall performance score, which feeds into the engineer’s appraisal record.

---

## 7. Target Users

| Role                        | Primary Use                                                      |
| --------------------------- | ---------------------------------------------------------------- |
| IT Support Engineer         | Pick up tickets from queue, update progress, resolve issues      |
| IT / DB Team Lead           | Monitor queue health, team KPIs, workload, and SLA compliance    |
| IT Manager                  | Oversight, escalation management, performance reporting          |
| General Manager / Executive | High-level dashboards, quarterly summaries                       |
| System Admin                | Multi-tenant config, SLA rules, KPI definitions, user management |

---

## 8. System Architecture

### Deployment Topology — 6 Independent Processes

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Next.js (web)   │     │ NestJS (API)    │     │ BullMQ Workers  │
│ Port 3000       │     │ Port 4000       │     │ (no HTTP port)  │
│ Docker svc 1    │     │ Docker svc 2    │     │ Docker svc 3    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                      │
         └─────────────────────────────┴─────────────────────┘
                                   │
              ┌─────────────────┤───────────────────┙
              │                 │                   │
    ┌────────────┐  ┌─────────────┐  ┌────────────┐
    │ MSSQL        │  │ Redis         │  │ PostgreSQL   │
    │ (operational)│  │ (cache+queues)│  │ (analytics)  │
    │ Docker svc 4 │  │ Docker svc 5  │  │ Docker svc 6 │
    └────────────┘  └─────────────┘  └────────────┘
                                ETL ↑
```

**No single point of failure:** each process is independently deployable, restartable, and scalable. BullMQ workers resume queued jobs from Redis on restart — no data loss. Docker/ECS auto-restarts crashed containers.

### Application Architecture

```
Next.js (frontend + SSR)
        │  tRPC (internal) + REST v1 (external)
        ▼
NestJS on Fastify (API layer)
├── Clerk JWT guard + tenant scope
├── Ticket Engine    ─────────────────► MSSQL
├── Queue Engine     ─────────────────► MSSQL + Redis (SLA timers)
├── KPI Engine       ─────────────────► MSSQL + PostgreSQL (actuals)
├── Task Engine      ─────────────────► MSSQL
├── Notification Engine ───────────► BullMQ → Nodemailer + SSE
├── Analytics Engine ──────────────► PostgreSQL + Redis cache
└── Health Monitor   ─────────────────► All 6 services (1s SSE stream to SysAdmin)

BullMQ Workers (separate Docker process)
├── sla-timers       ─ Pickup + resolution SLA countdown jobs
├── auto-assign      ─ Mutex-locked least-loaded assignment
├── notifications    ─ Email dispatch + push; ACK + resolved emails for self-service tickets
├── intake-poller    ─ IMAP email polling; inbound email → ticket creation via CategoryRouting
└── report-gen       ─ PDF/Excel generation + email delivery
```

### Monorepo Structure (Turborepo)

```
lotris/
├── apps/
│   ├── web/              ← Next.js 15 frontend
│   └── api/              ← NestJS + Fastify backend
├── packages/
│   ├── db/               ← Drizzle schema + migrations (shared by api + workers)
│   ├── types/            ← Shared TypeScript types + tRPC router types
│   ├── config/           ← Shared Zod env validation
│   └── ui/               ← ShadCN base components
├── workers/
│   └── jobs/             ← BullMQ worker process
├── docker/
│   ├── docker-compose.yml      ← Local dev — all 6 services
│   └── docker-compose.prod.yml ← Production overrides
├── mockups/          ← HTML/CSS UI mockups
├── docs/             ← CONTEXT.md, architecture, API docs
├── .github/
│   └── workflows/        ← CI/CD — web, api, workers deploy independently
├── turbo.json        ← Turborepo build orchestration
└── package.json      ← Root workspace
```

### Core Components

**Ticket Engine** — Lifecycle management, comments, attachments, audit trail

**Queue Engine** _(critical)_ — Team queues, ticket ordering by priority + SLA, pickup SLA tracking, auto-assignment logic

**KPI Engine** — KPI definition per engineer/team, real-time + batch computation, scoring

**Notification Engine** — Email + in-app alerts, SLA breach and escalation notifications

**Analytics Layer** — Pre-aggregated data for fast dashboard queries and scheduled reports

**Health Monitor** — 1-second health pings to all processes; SSE stream to SysAdmin ops dashboard; restart API with audit log

---

## 9. Data Model (High-Level)

**Core ticket entities:**
Tenants · Users (Engineers) · Roles · Teams · Tickets · Ticket_Comments · Tasks · Task_Assignments · Task_Checklist_Items · Notifications · Audit_Logs · Assignment_History · Queue_Config · Category_Routing

> **Tickets** carry a `source` field (`INTERNAL | SELF_SERVICE | EMAIL | API`) and optional `requester_name`, `requester_email` columns for externally-submitted tickets. The `Category_Routing` table maps category strings to a default team and priority, used by the intake module to auto-route incoming requests. Sprint 18 adds `sla_warning_level` (`NONE | AMBER | RED`) — computed by the SLA predictor BullMQ job every 5 minutes.

> **Tasks** carry a `source` field (`LEAD_ASSIGNED | SELF_LOGGED`) and a `created_by` FK. Self-logged tasks are visible to the team lead and feed KPI actuals the same way lead-assigned tasks do.

> **Sprint 18 (Phase 2) additions:** `kpi_trend_snapshots` table in PostgreSQL — stores one row per engineer/KPI/period snapshot with `actual_to_date`, `projected_eop`, `target`, and `warning_level`. Used for sparkline charts and early-warning flags in the KPI dashboard.

**KPI entities:**
KPI_Definitions · KPI_Team_Targets · KPI_Engineer_Assignments · KPI_Agreements · KPI_Agreement_Areas · KPI_Agreement_Metrics · KPI_Results · KPI_Actuals

**Key relationships:**

- `KPI_Definitions` → global library managed by IT Manager
- `KPI_Team_Targets` → per-team overrides on a KPI definition
- `KPI_Engineer_Assignments` → which KPIs are active for an engineer in a period + individual target overrides
- `KPI_Agreements` → one agreement per engineer per review period; has a status (Draft / Pending Review / Active)
- `KPI_Agreement_Areas` → named KPI areas within an agreement (e.g. Product Quality)
- `KPI_Agreement_Metrics` → individual metric rows: description, weight, period, target, actual score
- `KPI_Results` → computed weighted scores per area and overall, per period

---

## 10. Multi-Tenancy

- Each organisation = Tenant; all tables include `tenant_id`
- Shared DB (SaaS default) or Dedicated DB (enterprise option)
- Per-tenant config: SLA rules, KPI definitions, workflow rules

---

## 11. Development Roadmap & Build Plan

### Guiding Principles

- Build the **Queue Engine** first among the domain modules — it is the most complex and most critical
- Auth and multi-tenancy must be in place before any other module
- The KPI Engine depends on real ticket and task data — build it last in Phase 1
- Every sprint delivers a working vertical slice, not back-end scaffolding alone

---

### Confirmed Tech Stack

#### Frontend

| Layer             | Choice                       | Notes                                                                |
| ----------------- | ---------------------------- | -------------------------------------------------------------------- |
| Framework         | **Next.js 15** (App Router)  | React 18 + RSC; SSR, SSG, and client components per page             |
| Language          | TypeScript                   | End-to-end type safety across frontend + backend                     |
| Styling           | **Tailwind CSS**             | Utility-first; ~5–10 KB production bundle after purge                |
| Component library | **ShadCN/UI**                | Components copied into repo (no runtime dep); built on Radix UI      |
| Server state      | **TanStack Query**           | Async data fetching, caching, background refresh, optimistic updates |
| Client state      | **Zustand**                  | ~1 KB; UI state (drawers, filters, sidebar, selections)              |
| Charts            | **Tremor**                   | Tailwind-native dashboard charts; KPI and report visualisations      |
| Live data         | **SSE** (Server-Sent Events) | Queue counts, live ticket updates, KPI stream                        |
| Dark mode         | **next-themes**              | `ThemeProvider attribute="class"`; `localStorage`-backed; Moon/Sun toggle in topbar |

**Rendering strategy:**

- Static pages (login, marketing) → SSG, served from CDN edge
- Data pages (tickets, tasks, KPIs) → React Server Components — HTML on first load, zero JS for static parts
- Interactive components (drawers, forms, live panels) → Client Components

**Responsive + PWA strategy:**

- **Desktop (1280px+)** — full sidebar, table views, multi-column layouts — primary engineer and lead experience
- **Tablet (768–1279px)** — sidebar collapses to icon rail; tables scroll horizontally; drawers full-height
- **Mobile (<768px)** — sidebar becomes bottom nav; tables become card stacks; drawers become full-screen sheets; KPI widgets stack vertically
- **PWA** — `next-pwa` manifest; installable on iOS/Android home screen; offline shell via service worker; push notifications (Android; iOS 16.4+)
- Native mobile app deferred — revisit only if a specific role (e.g. field engineers) drives clear demand post-launch

#### Backend

| Layer          | Choice                            | Notes                                                                                                                  |
| -------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Framework      | **NestJS** on **Fastify** adapter | 3–4× throughput vs Express; keeps full NestJS DI + decorator model                                                     |
| Language       | TypeScript                        | Shared types across frontend (via tRPC) and backend                                                                    |
| ORM            | **Drizzle ORM**                   | ~7 KB, SQL-first, fully type-safe, no hidden N+1, compiles to raw SQL                                                  |
| Internal API   | **tRPC**                          | End-to-end type-safe RPC between Next.js and NestJS; zero boilerplate                                                  |
| External API   | **REST v1**                       | Public/documented endpoints for third-party integrations                                                               |
| Operational DB | **MSSQL**                         | Transactional data — tickets, users, queues, tasks, KPIs; `mssql` pool                                                 |
| Analytics DB   | **PostgreSQL**                    | Pre-aggregated dashboard + report data; ETL from MSSQL; postgres.js                                                    |
| Cache          | **Redis**                         | Dashboard metrics (TTL 30s), rate limiting, session blocklist, BullMQ                                                  |
| Queue workers  | **BullMQ** (Redis-backed)         | SLA countdown timers, auto-assignment with mutex lock, scheduled reports                                               |
| Auth           | **Clerk**                         | Hosted identity platform; Google + Microsoft social login, OIDC, SAML (enterprise); Clerk JWT verified by NestJS guard |
| Monitoring     | **Health check API + SSE**        | 1s health pings per service; SysAdmin ops dashboard (page 10); public status page (`status.lotris.io`)                 |
| Notifications  | **Nodemailer + SSE**              | Email dispatch in BullMQ worker; in-app SSE stream per user                                                            |
| Reporting      | **ExcelJS + PDFKit**              | Excel table exports, PDF report templates; generated in worker                                                         |
| Hosting        | **Docker → AWS ECS / Azure ACI**  | Containerised; frontend and API as separate services                                                                   |
| CI/CD          | **GitHub Actions**                | Lint → test → build → Docker push → deploy                                                                             |

**Key backend decisions:**

- NestJS on **Fastify** from day one — not retrofitted
- **Drizzle** over TypeORM/Prisma — explicit SQL, no query magic, 7 KB runtime
- **tRPC** for all internal Next.js ↔ NestJS calls; REST only for external consumers
- **Redis mutex locks** on auto-assignment jobs to prevent race conditions
- **Dashboard cache layer** — metrics pre-computed on write, served from Redis on read (<100ms)
- **Auth boundary** — Clerk owns identity verification; NestJS guard verifies Clerk JWT and issues a scoped internal JWT with `{ tenantId, role }` claims; Clerk `Organization` maps to Lotris tenant

---

### Build Sequence

#### Sprint 1–2 · Foundation

**Deliverable:** Working auth, tenant scaffold, user & team management, frontend shell

| Task                                            | Notes                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| DB schema — tenants, users, roles, teams        | Multi-tenant from day 1; all tables carry `tenant_id`                                      |
| Auth — Clerk; Google + Microsoft social login   | OIDC + SAML available for enterprise tenants; Clerk `Organization` = Lotris tenant         |
| NestJS auth guard                               | Verifies Clerk JWT on every protected route; issues internal JWT with `{ tenantId, role }` |
| JIT user provisioning via Clerk webhook         | User created in Lotris on first Clerk login; `clerk_user_id` stored on user record         |
| User management API (CRUD)                      | Avatar, role, team assignment, status; `clerk_user_id` → `external_id` field               |
| Team management API                             | Create teams, assign lead, add/remove members                                              |
| Next.js scaffold — App Router, layouts, sidebar | Port mockup tokens to `tailwind.config.ts`; add ShadCN base components                     |
| Login screen (01) wired to Clerk `<SignIn />`   | Role-based redirect post-login; drop-in component                                          |

**Dependency gate:** No other sprint begins until auth + tenancy is green and reviewed.

---

#### Sprint 3–4 · Ticket Core

**Deliverable:** Full ticket lifecycle, comments, attachments, audit trail, basic notifications

| Task                                    | Notes                                             |
| --------------------------------------- | ------------------------------------------------- |
| Ticket entity + lifecycle state machine | Full status graph with transition validation      |
| Ticket CRUD API                         | Create, read, update with full tenant scope       |
| Comments + internal notes               | Threaded; internal flag hides from external views |
| Attachment upload                       | S3 / blob storage; file type and size validation  |
| Audit trail service                     | Immutable log of all state changes + field edits  |
| Ticket list UI (03) wired to API        | Table, filters, status badges, pagination         |
| Ticket detail drawer                    | Full view with comments, audit history            |
| Basic notification triggers             | On ticket creation, assignment, and closure       |

---

#### Sprint 5–6 · Queue Engine _(critical path)_

**Deliverable:** Team queues, controlled pickup, pickup SLA timer, auto-assignment, escalation

| Task                                          | Notes                                                     |
| --------------------------------------------- | --------------------------------------------------------- |
| Queue config per team                         | SLA thresholds, capacity limits, stored in `Queue_Config` |
| Team assignment routing (TEAM_ASSIGNED state) | Ticket enters a team queue; no engineer yet               |
| Queue list API — ordered by priority + SLA    | Engineers see their team queue in priority order          |
| Controlled pickup with workload check         | Reject claim if engineer is at max open tickets           |
| Pickup SLA countdown (BullMQ delayed job)     | Job fires on SLA breach → triggers auto-assignment        |
| Auto-assignment logic                         | Least-loaded engineer; round-robin fallback on tie        |
| Resolution SLA timer                          | Starts on ASSIGNED; escalation fires on breach            |
| Escalation flow                               | State → ESCALATED; manager notification sent              |
| Queue health dashboard section (02)           | Live queue stats, SLA heat map, workload gauges           |

---

#### Sprint 7 · Task Management

**Deliverable:** Full task module — lead-assigned and engineer self-logged, checklists, KPI linkage

| Task                                  | Notes                                                                |
| ------------------------------------- | -------------------------------------------------------------------- |
| Task entity + API (CRUD)              | `source`: `LEAD_ASSIGNED \| SELF_LOGGED`; `created_by` FK            |
| Task types enum                       | Maintenance, DR/BCP, Change Request, Documentation, Training, Ad Hoc |
| Checklist support                     | `Task_Checklist_Items` child entity; ordered steps                   |
| Progress tracking                     | Computed from checklist completion or manual override (0–100)        |
| Task-KPI link                         | FK to `KPI_Definitions`; task completion feeds KPI actuals           |
| Lead assigns to one or more engineers | `Task_Assignments` many-to-many; per-assignee completion             |
| Engineer self-logs task to self       | `source = SELF_LOGGED`, `created_by = engineer_id`                   |
| Visibility rules                      | Self-logged tasks visible to team lead; flag in API response         |
| Task page UI (09) wired to API        | Both drawer modes (lead assign + self-log) wired to backend          |

---

#### Sprint 8–10 · KPI Engine

**Deliverable:** Full 3-layer KPI system — definitions, assignment, agreements, actuals, scoring

| Task                                    | Notes                                                          |
| --------------------------------------- | -------------------------------------------------------------- |
| KPI Definitions API (CRUD)              | IT Manager; name, type, target, direction, weight, scope       |
| Per-team target overrides               | `KPI_Team_Targets`; matrix UI in page 06                       |
| Per-engineer KPI assignment + overrides | `KPI_Engineer_Assignments`; Team Lead via page 07              |
| KPI Agreement API                       | Per-engineer per-period; Draft → Pending → Active status       |
| KPI Agreement Areas + Metric Rows       | Area groups with weighted metrics; page 08                     |
| Agreement sign-off flow                 | Lead submits → engineer reviews → accepts → Active             |
| Document upload + column mapping        | Parse Excel/CSV; map columns to metric fields; preview         |
| KPI actuals ingestion                   | Auto: resolved tickets + completed tasks; Manual: direct entry |
| Scoring engine                          | Weighted score per area + overall for the period               |
| KPI dashboard UI (04) wired to API      | Real-time metrics, trend lines, RAG indicators                 |

---

#### Sprint 11–12 · Reporting & Full Dashboard

**Deliverable:** Analytics layer, complete dashboard, scheduled reports, PDF + Excel output

| Task                                    | Notes                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| Analytics DB setup + ETL pipeline       | Pre-aggregate from MSSQL into PostgreSQL for fast dashboard + report queries |
| Redis cache layer for dashboard metrics | Pre-computed counts, SLA rates, KPI scores                                   |
| Main dashboard (02) — all sections live | Executive summary, queue health, ticket analytics, engineer perf             |
| Reports module (05)                     | On-demand and scheduled report generation                                    |
| PDF report generation                   | Ticket summary, SLA compliance, KPI report templates                         |
| Excel export from all table views       | One-click export on any data table                                           |
| Scheduled report delivery (email)       | Monthly / quarterly auto-distribution with recipient lists                   |

---

### Module Dependency Tree

```
Auth & Tenancy
     │
     ├─► Ticket Core ────────────────────┐
     │         │                          │
     │         └─► Queue Engine             │
     │                   │                 │
     │                   └─► Task Module    │
     │                             │       │
     └────────────────────────┤       │
                                   ▼       ▼
                              KPI Engine
                                   │
                                   ▼
                          Reporting & Dashboard
```

---

### Milestone Summary

| Milestone       | Sprint | Deliverable                                             |
| --------------- | ------ | ------------------------------------------------------- |
| M1 — Auth       | 2      | Login, RBAC, tenant scaffold, user & team management    |
| M2 — Tickets    | 4      | Full ticket lifecycle, comments, audit, notifications   |
| M3 — Queue      | 6      | Team queues, pickup, auto-assign, SLA escalation        |
| M4 — Tasks      | 7      | Lead-assigned + self-logged tasks, checklists, KPI link |
| M5 — KPIs       | 10     | 3-layer KPI system, agreements, scoring, KPI dashboard  |
| M6 — Reports    | 12     | Analytics layer, full dashboard, scheduled reports      |
| M7 — Monitoring | 13     | SysAdmin ops dashboard, restart controls, status page   |
| M8 — UI Quality | 15     | Dark mode, dashboard accuracy, tickets page fully functional, role-gated assign |
| M9 — QA & Monitor + KPI My Agreement | 16  | Queue/Tickets/Tasks role-visibility, Monitor wall, cross-team access, mobile CSS, KPI My Agreement, TEAM_LEAD builder access, Daily period, submit button fix |
| M10 — Ticket Intake               | 17  | Public web form (`/request`), IMAP email poller, CategoryRouting config, source field on tickets, ACK + resolved notifications, source badges in UI |
| M11 — Phase 2: Intelligence       | 18  | SLA breach prediction (amber/red warnings, notifications), KPI trend analysis (sparklines, flag pills, daily digest email) |

---

### Phase 2 — Intelligence _(in progress — Sprint 18)_

- **Sprint 18:** SLA breach prediction (linear projection, amber/red warnings in ticket list + dashboard, email + SSE notifications to assignee + lead, BullMQ `sla-predictor` cron every 5 min)
- **Sprint 18:** KPI performance trend analysis (linear regression on actuals, sparkline charts, amber/red flag pills in KPI dashboard, daily digest email to team leads, BullMQ `kpi-trend` cron every 30 min)
- **Sprint 19 (planned):** Automated quarterly report generation and distribution
- **Sprint 19 (planned):** Engineer workload rebalancing suggestions

### Phase 3 — AI & Automation

- AI-assisted root cause classification for recurring tickets
- Predictive KPI performance forecasting
- Natural language report summaries
- Monitoring integrations (Prometheus, Grafana, Datadog)

---

## 12. Brand Identity

| Element          | Detail                                                  |
| ---------------- | ------------------------------------------------------- |
| Name             | Lotris                                                  |
| Tagline          | _"Where performance surfaces."_                         |
| Personality      | Calm. Precise. Dependable.                              |
| Tone             | Professional, clear, authoritative — never loud         |
| Colour direction | Deep navy / teal / clean white — enterprise trustworthy |

### Alternative Taglines

- _"Tickets resolved. Targets met. Clarity delivered."_
- _"Rise above the noise."_
- _"Every issue tracked. Every metric owned."_
- _"From request to result."_

---

## 13. Tech Stack (Confirmed)

### Frontend

| Layer        | Choice         | Notes                                                          |
| ------------ | -------------- | -------------------------------------------------------------- |
| Framework    | Next.js 15     | App Router; React 18 + RSC; SSR, SSG, and Client Components    |
| Language     | TypeScript     | End-to-end type safety                                         |
| Styling      | Tailwind CSS   | ~5–10 KB production CSS bundle after purge                     |
| Components   | ShadCN/UI      | Copied into repo, no runtime dependency, Radix UI primitives   |
| Server state | TanStack Query | Data fetching, caching, background refresh, optimistic updates |
| Client state | Zustand        | ~1 KB; drawers, filters, sidebar, selections                   |
| Charts       | Tremor         | Tailwind-native; KPI dashboard and report visualisations       |
| Live data    | SSE            | Queue counts, live ticket feed, KPI updates                    |
| Dark mode    | next-themes    | `ThemeProvider attribute="class"`; localStorage-backed; Moon/Sun toggle in topbar |

### Backend

| Layer          | Choice                       | Notes                                                                                            |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Framework      | NestJS on Fastify adapter    | 3–4× throughput vs Express; full DI + decorator model retained                                   |
| Language       | TypeScript                   | Shared types with frontend via tRPC                                                              |
| ORM            | Drizzle ORM                  | ~7 KB runtime; SQL-first; fully type-safe; no hidden N+1                                         |
| Internal API   | tRPC                         | Type-safe RPC between Next.js and NestJS; no contract to maintain                                |
| External API   | REST v1                      | Public endpoints for third-party integrations                                                    |
| Operational DB | MSSQL                        | Transactional data — tickets, users, queues, tasks, KPIs; mssql pool                             |
| Analytics DB   | PostgreSQL                   | Pre-aggregated dashboard + report data; ETL pipeline from MSSQL; postgres.js                     |
| Cache          | Redis                        | Dashboard metrics (TTL 30s), rate limiting, blocklist, BullMQ                                    |
| Queue workers  | BullMQ                       | SLA timers, auto-assign (mutex locked), scheduled report dispatch                                |
| Auth           | Clerk                        | Hosted identity; Google + Microsoft social login, OIDC, SAML; Clerk JWT verified by NestJS guard |
| Notifications  | Nodemailer + SSE             | Email via BullMQ worker; in-app via SSE stream                                                   |
| Reporting      | ExcelJS + PDFKit             | Excel exports and PDF reports generated in BullMQ worker                                         |
| Hosting        | Docker → AWS ECS / Azure ACI | Frontend and API containerised as separate services                                              |
| CI/CD          | GitHub Actions               | Lint → test → build → Docker push → deploy                                                       |

---

## 14. Folder Structure

```
lotris/                          ← monorepo root
├── apps/
│   ├── web/                     ← Next.js 15 frontend
│   └── api/                     ← NestJS + Fastify backend
├── packages/
│   ├── db/                      ← Drizzle schema + migrations (shared by api + workers)
│   ├── types/                   ← Shared TypeScript types + tRPC router types
│   ├── config/                  ← Shared Zod env validation
│   └── ui/                      ← ShadCN base components
├── workers/
│   └── jobs/                    ← BullMQ worker process
├── docker/
│   ├── docker-compose.yml      ← Local dev — all 6 services
│   └── docker-compose.prod.yml ← Production overrides
├── mockups/                 ← HTML/CSS UI mockups
├── docs/
│   ├── CONTEXT.md              ← This file — product context and spec
│   ├── architecture/           ← System design diagrams
│   └── api/                     ← API documentation
├── .github/
│   └── workflows/               ← CI/CD — web, api, workers deploy independently
├── turbo.json               ← Turborepo build orchestration
└── package.json             ← Root workspace
```

---

## 15. UI Mockups

| File                        | Page                           | Primary Role         |
| --------------------------- | ------------------------------ | -------------------- |
| `01-login-v2.html`          | Login                          | All                  |
| `02-dashboard-v2.html`      | Main Dashboard                 | All                  |
| `03-tickets-v2.html`        | Ticket Management              | All                  |
| `04-kpis-v2.html`           | KPI Performance View           | Engineer / Lead      |
| `05-reports-v2.html`        | Reports                        | Lead / Manager       |
| `06-kpi-setup-v2.html`      | KPI Definitions & Setup        | IT Manager           |
| `07-team-kpi-setup-v2.html` | Team KPI Assignment            | Team Lead            |
| `08-kpi-agreement-v2.html`  | KPI Agreement Builder          | Team Lead            |
| `09-tasks-v2.html`          | Task Assignment & Self-Logging | Team Lead / Engineer |
| `10-sysadmin-ops-v2.html`   | System Health & Ops Dashboard  | System Admin         |

> **Task modes:** Team Leads assign tasks to one or more engineers. Engineers can also open the drawer in **self-log mode** to record their own tasks — these are visible to their lead and contribute to KPI actuals the same way lead-assigned tasks do.

---

## 16. Local Development Environment

### Process Manager

All services run under **pm2** in local dev:

| pm2 ID | Name              | Port | Restart behaviour            |
| ------ | ----------------- | ---- | ---------------------------- |
| 0      | `lotris-api`      | 4000 | tsx watch — auto-reloads on file save |
| 6      | `lotris-web`      | 3000 | Next.js HMR — hot-reloads on file save |
| 12     | `lotris-workers`  | —    | BullMQ workers; started via `workers/jobs/ecosystem.config.cjs` (gitignored, local-dev only) |

pm2 binary: `/Users/kwekku/.nvm/versions/node/v24.13.0/lib/node_modules/pm2/bin/pm2`  
Next.js started with `-H 0.0.0.0` to bind on LAN. Current dev LAN IP: `192.168.8.133`.

### Dev Login Users

Development shortcut: `GET /api/dev-login?user={alias}` — sets a Clerk-compatible dev session without social login.

| Alias  | Role        | Notes                          |
| ------ | ----------- | ------------------------------ |
| yaw    | ENGINEER    | Standard engineer scope        |
| kofi   | TEAM_LEAD   | DB/IT team                     |
| kwame  | SUPERADMIN  | Full access                    |
| abena  | ADMIN       | Tenant admin                   |
| fatima | IT_MANAGER  | KPI definitions, oversight     |

### Database

- **MSSQL** connection string: `mssql://sa:Lotris@Dev2024!@localhost:1433/lotris`
- Snake_case column names throughout. Key column: `sla_resolution_deadline` (not `sla_deadline`).
- Priority values: `1 = Critical, 2 = High, 3 = Medium, 4 = Low` — always `ORDER BY priority ASC`.
- 347 tickets in local dev DB; 204 open; 187 SLA breached.
- MSSQL reserved keyword `open` — use alias `openCount` in raw SQL.

### CSS Design System

The live implementation uses the **v2 CSS design system** ported from `mockups/style-v2.css` into `apps/web/app/globals.css`. Most page components use v2 CSS classes (e.g. `v2-card`, `v2-btn`, `v2-stats-grid`). The Monitor page uses 100% inline styles. Tailwind is configured but the primary styling approach in built components is the v2 CSS class system.

### tRPC Procedure Middleware

| Procedure | Allowed roles | Purpose |
|---|---|---|
| `publicProcedure` | anyone (no auth) | Monitor stats, public endpoints |
| `protectedProcedure` | any authenticated user | Tickets, tasks, own user data |
| `managerProcedure` | SUPERADMIN, ADMIN, IT_MANAGER | Reporting, config |
| `adminProcedure` | SUPERADMIN, ADMIN | User management, destructive ops |
| `kpiAgreementProcedure` | SUPERADMIN, ADMIN, IT_MANAGER, TEAM_LEAD | KPI agreement builder (create, setAreas) |

### tRPC Client Pattern

`AppRouter` in `@lotris/types` is typed as `any` to avoid complex type propagation. All tRPC calls use **bracket notation** to avoid TypeScript errors:

```ts
trpc['users.me'].useQuery()
trpc['tickets.list'].useQuery({ page: 1, limit: 25 })
trpc['kpi.agreements.list'].useQuery({ engineerId: me.id })
```

### Monitor Page

- URL: `/monitor` — **public route** (no Clerk auth required)
- `middleware.ts` includes `/monitor(.*)` in `publicRoutes`
- Uses `MonitorProviders` (lightweight tRPC + QueryClient, no auth token)
- Queries `monitor.stats` tRPC procedure (also public/unauthenticated)
- Features: real-time stat cards, animated priority ticker (20 tickets), light/dark theme toggle (persisted via `localStorage`)

---

## 17. Out of Scope (v1)

- Full customer-facing self-service portal (Sprint 17 adds a limited public intake form `/request` — no account or tracking dashboard)
- Native mobile app — deferred; responsive PWA covers all roles in v1; revisit if field engineers drive specific demand
- Real-time chat / live support
- Billing / subscription management
- Prometheus / Grafana / Datadog integrations (Phase 3)
