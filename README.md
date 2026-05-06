# Lotris

> **Help Desk Ticket & KPI Management System**
> _"Where performance surfaces."_

[![Status](https://img.shields.io/badge/status-in%20development-blue)]()
[![Phase](https://img.shields.io/badge/phase-1%20foundation-teal)]()
[![License](https://img.shields.io/badge/license-private-lightgrey)]()

---

## Overview

**Lotris** is a multi-tenant Help Desk Ticket and KPI Management System built for IT customer support teams. It delivers real-time ticket tracking, team-based queue management, engineer workload balancing, KPI-driven performance tracking, and advanced reporting — all in one clean admin platform designed for speed and daily support operations.

> The name fuses **Lotus** (clarity, resilience, emergence from complexity) with **iris** (visibility, insight, growth) — every issue raised and every target set should surface clearly, be tracked precisely, and be resolved with full accountability.

---

## Core Pillars

|     | Pillar        | What it does                                                                     |
| --- | ------------- | -------------------------------------------------------------------------------- |
| 🎫  | **Tickets**   | End-to-end ticket lifecycle — log, queue, assign, escalate, resolve, close       |
| 🔀  | **Queue**     | Team queues, controlled pickup, workload enforcement, SLA-driven auto-assignment |
| 📊  | **KPIs**      | Metric tracking aligned to individual, team, and organisational targets          |
| 📋  | **Reporting** | Automated, scheduled, and on-demand operational and performance reports          |

---

## Ticket Lifecycle

```
NEW → TEAM_ASSIGNED → UNASSIGNED → ASSIGNED → IN_PROGRESS → ESCALATED → RESOLVED → CLOSED
```

The system uses a **hybrid queue-based assignment model**: tickets are routed to a team queue first, engineers pick them up from the queue, and auto-assignment kicks in if the pickup SLA is breached.

---

## Features

- **Ticket Lifecycle Management** — Full audit trail from open to close
- **Queue Management** — Team queues, controlled pickup, workload enforcement, priority ordering
- **Auto-Assignment** — Least-loaded engineer assignment on pickup SLA breach
- **Task Management** — Assign non-ticket work items to engineers (maintenance, DR drills, change requests) and allow engineers to self-log their own tasks for personal tracking
- **KPI Dashboard** — Real-time metrics per engineer, team, and organisation
- **SLA Tracking** — Pickup SLA + resolution SLA monitoring with automated escalation
- **Automated Notifications** — Email and in-app alerts on SLA breach, escalation, KPI deadline
- **Engineer Workload Balancing** — Max workload enforcement and queue visibility
- **Role-based Access Control** — Granular permissions per user role
- **Multi-Tenancy** — Each organisation is an isolated tenant with its own SLA and KPI config
- **Operational & Performance Reports** — Ticket summaries, SLA compliance, queue reports, KPI reports
- **Responsive Design + PWA** — Fully responsive across desktop, tablet, and mobile; installable as a Progressive Web App
- **System Health Monitoring** — Real-time SysAdmin ops dashboard showing live process status, queue depths, CPU/memory, and restart controls

---

## KPI System

Lotris uses a **three-layer KPI model** that separates global configuration from team-level assignment and individual performance agreements.

### Layer 1 — KPI Definitions (IT Manager)

The IT Manager defines KPIs globally: name, metric type, target value, direction (higher/lower is better), weight, and scope (Org / Team / Engineer). These are the building blocks.

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

### Layer 2 — KPI Assignment (Team Lead)

Team Leads assign active KPI definitions to their individual engineers and optionally override targets. A senior engineer can have a higher SLA target; a junior engineer can have a lower productivity threshold. Scoped to the current review period.

### Layer 3 — KPI Agreement (Team Lead + Engineer)

For each review period, the Team Lead builds a structured **KPI Agreement** with the engineer — a formal performance contract. Agreements are organised into **KPI Areas** (e.g. Product Quality, Professional Development, Customer Focus), each containing multiple weighted metric descriptions. Weights across all areas must total 100. Both parties sign off digitally before the period begins. Agreements can be entered manually or imported from an Excel/CSV template.

---

## Target Users

| Role                        | Primary Use                                                |
| --------------------------- | ---------------------------------------------------------- |
| IT Support Engineer         | Pick up tickets, update progress, resolve issues           |
| IT / DB Team Lead           | Monitor queue health, team KPIs, workload, SLA compliance  |
| IT Manager                  | Oversight, escalations, performance reporting              |
| General Manager / Executive | High-level dashboards, quarterly summaries                 |
| System Admin                | Multi-tenant config, SLA rules, KPI definitions, user mgmt |

---

## Architecture

### Deployment Topology (6 independent processes)

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

Each process is independently deployable, restartable, and scalable. A crash in one does not cascade to others. BullMQ workers resume jobs from Redis on restart — no data loss.

### Application Architecture

```
Next.js (frontend + SSR)
        │  tRPC (internal) + REST v1 (external)
        ▼
NestJS on Fastify (API)
├── Clerk JWT guard + tenant scope
├── Ticket Engine    ─────────────────► MSSQL
├── Queue Engine     ─────────────────► MSSQL + Redis (SLA timers)
├── KPI Engine       ─────────────────► MSSQL + PostgreSQL (actuals)
├── Task Engine      ─────────────────► MSSQL
├── Notification Engine ───────────► BullMQ → Nodemailer + SSE
├── Analytics Engine ──────────────► PostgreSQL + Redis cache
└── Health Monitor   ─────────────────► All services (SSE stream to SysAdmin)

BullMQ Workers (separate process)
├── sla-timers       ─ Pickup + resolution SLA countdown jobs
├── auto-assign      ─ Mutex-locked least-loaded assignment
├── notifications    ─ Email dispatch + push
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
│   └── ui/               ← ShadCN components (shared base)
├── workers/
│   └── jobs/             ← BullMQ worker process
├── docker/
│   ├── docker-compose.yml      ← Local dev (all 6 services)
│   └── docker-compose.prod.yml ← Production overrides
├── mockups/          ← HTML/CSS UI mockups
├── docs/             ← CONTEXT.md, architecture, API docs
├── .github/
│   └── workflows/        ← CI/CD — web, api, workers deploy independently
├── turbo.json        ← Turborepo build orchestration
└── package.json      ← Root workspace
```

---

## Build Plan

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

**Rendering strategy:**

- Static pages (login, marketing) → SSG, served from CDN edge
- Data pages (tickets, tasks, KPIs) → React Server Components — HTML on first load, zero JS for static parts
- Interactive components (drawers, forms, live panels) → Client Components

**Responsive + PWA strategy:**

- **Desktop (1280px+)** — full sidebar, table views, multi-column layouts — primary engineer and lead experience
- **Tablet (768–1279px)** — sidebar collapses to icon rail; tables scroll horizontally; drawers full-height
- **Mobile (<768px)** — sidebar becomes bottom nav; tables become card stacks; drawers become full-screen sheets; KPI widgets stack vertically
- **PWA** — `next-pwa` manifest; installable on iOS/Android home screen; offline shell via service worker; native-style push notifications (Android; iOS 16.4+)

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
| Monitoring     | **Health check API + SSE**        | Per-process health pings every 1s; SysAdmin ops dashboard (page 10); public status page (`status.lotris.io`)           |
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

**Deliverable:** Auth, tenant scaffold, user & team management, frontend shell

- DB schema — tenants, users, roles, teams (all tables carry `tenant_id`)
- Auth — Clerk wired to Google + Microsoft social login; OIDC + SAML available for enterprise tenants
- NestJS guard verifies Clerk JWT; issues internal scoped JWT with `{ tenantId, role }` claims
- JIT user provisioning via Clerk webhook on first login
- User & team management APIs (NestJS)
- Next.js scaffold — App Router, layouts, sidebar, design system ported from mockups to Tailwind + ShadCN
- Login screen wired to Clerk (`<SignIn />` component)

**Gate:** Nothing else starts until auth + tenancy is green.

#### Sprint 3–4 · Ticket Core

**Deliverable:** Full ticket lifecycle, comments, audit trail, basic notifications

- Ticket entity + lifecycle state machine
- Comments, internal notes, attachments
- Immutable audit trail service
- Ticket list + detail drawer UI (03)
- Notification triggers (create, assign, close)

#### Sprint 5–6 · Queue Engine _(critical path)_

**Deliverable:** Team queues, controlled pickup, pickup SLA, auto-assignment, escalation

- Queue config per team (SLA rules, capacity limits)
- Team assignment routing (TEAM_ASSIGNED state)
- Controlled pickup with workload enforcement
- Pickup SLA countdown (BullMQ delayed job) → auto-assign on breach
- Resolution SLA timer → escalation on breach
- Queue dashboard section (02) live

#### Sprint 7 · Task Management

**Deliverable:** Lead-assigned tasks + engineer self-logging, KPI linkage, checklists

- Task entity — `source` field: `LEAD_ASSIGNED | SELF_LOGGED`
- Task types: Maintenance, DR/BCP, Change Request, Documentation, Training, Ad Hoc
- Checklist sub-steps per task (`Task_Checklist_Items`)
- Progress tracking (0–100, computed from checklist or manual)
- Task-KPI link (completion feeds KPI actuals)
- Lead assigns to one or more engineers; engineer self-logs to self
- Task page UI (09) — both drawer modes wired to API

#### Sprint 8–10 · KPI Engine

**Deliverable:** Full 3-layer KPI system — definitions, assignment, agreements, scoring

- KPI Definitions CRUD — IT Manager (Layer 1, page 06)
- Per-team target overrides matrix (Layer 1, page 06)
- Per-engineer KPI assignment + target overrides — Team Lead (Layer 2, page 07)
- KPI Agreement API — Draft → Pending → Active sign-off flow (Layer 3, page 08)
- Agreement areas + metric rows; Excel/CSV import with column mapper
- KPI actuals ingestion — auto from tickets + tasks; manual entry
- Weighted scoring engine per area + overall per period
- KPI dashboard UI (04) — real-time metrics, RAG indicators

#### Sprint 11–12 · Reporting & Full Dashboard

**Deliverable:** Analytics layer, scheduled reports, complete dashboard

- PostgreSQL analytics DB + ETL pipeline (pre-aggregated from MSSQL operational DB)
- Redis cache layer for dashboard metrics
- Main dashboard (02) — all sections live (executive summary, queue, tickets, engineer performance)
- Reports module (05) — on-demand and scheduled
- PDF report generation (ticket summary, SLA compliance, KPI report)
- Excel export from all table views
- Scheduled report delivery via email

#### Sprint 13 · System Health Monitoring

**Deliverable:** SysAdmin ops dashboard, public status page, restart controls

- Health check endpoint per service (`/health`) — returns status, uptime, CPU, memory
- 1-second SSE stream from API → SysAdmin ops dashboard (page 10)
- Per-process status: UP / DEGRADED / DOWN with uptime %, last ping, CPU, memory
- BullMQ queue panel: waiting / active / failed / delayed per queue
- Live incident log: timestamped health check failures with duration and auto-resolution
- Restart controls: `POST /admin/services/:name/restart` — ADMIN role only, confirmation dialog, 60s cooldown, full audit log
- DB services: "Test connection" and "Clear pool" only (no full restart from UI)
- Public status page (`status.lotris.io`) — separate Next.js deployment; auto-generated from health data; shows UP/DEGRADED/DOWN per service + incident history

---

### Milestones

| Milestone       | Sprint | Deliverable                                             |
| --------------- | ------ | ------------------------------------------------------- |
| M1 — Auth       | 2      | Login, RBAC, tenant scaffold, user & team management    |
| M2 — Tickets    | 4      | Full ticket lifecycle, comments, audit, notifications   |
| M3 — Queue      | 6      | Team queues, pickup, auto-assign, SLA escalation        |
| M4 — Tasks      | 7      | Lead-assigned + self-logged tasks, checklists, KPI link |
| M5 — KPIs       | 10     | 3-layer KPI system, agreements, scoring, KPI dashboard  |
| M6 — Reports    | 12     | Analytics layer, full dashboard, scheduled reports      |
| M7 — Monitoring | 13     | SysAdmin ops dashboard, restart controls, status page   |

---

### Phase 2 — Intelligence _(post-MVP)_

- SLA breach prediction and automated alerts
- KPI performance trend analysis and early-warning flags
- Automated quarterly report generation
- Engineer workload rebalancing suggestions

### Phase 3 — AI & Automation

- AI-assisted root cause classification
- Predictive KPI performance forecasting
- Natural language report summaries
- Monitoring integrations (Prometheus, Grafana, Datadog)

---

## UI Mockups

| File                        | Page                           | Role                 |
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

---

## Project Structure

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
│   ├── docker-compose.yml       ← Local dev (all 6 services)
│   └── docker-compose.prod.yml  ← Production overrides
├── mockups/                     ← HTML/CSS UI mockups
├── docs/
│   ├── CONTEXT.md               ← Full product context and spec
│   ├── architecture/            ← System design diagrams
│   └── api/                     ← API documentation
├── .github/
│   └── workflows/               ← CI/CD — web, api, workers deploy independently
├── turbo.json                   ← Turborepo build orchestration
└── package.json                 ← Root workspace
```

---

## Documentation

| Doc                                | Description                                        |
| ---------------------------------- | -------------------------------------------------- |
| [docs/CONTEXT.md](docs/CONTEXT.md) | Full product brief, goals, users, KPIs, tech stack |
| `docs/architecture/`               | System design and data flow diagrams               |
| `docs/api/`                        | API endpoint documentation                         |

---

## Development Workflow

### 3-Agent Model

All build work runs through three coordinated AI agents defined in `.github/agents/`:

| Agent | Instructions | Domain |
|-------|-------------|--------|
| **QA Agent** | `.github/agents/qa-agent.instructions.md` | Job assignment, validation, quality gates, git push, doc updates |
| **Frontend Dev** | `.github/agents/frontend-agent.instructions.md` | Next.js 15, UI, tRPC client, Tailwind, ShadCN, PWA |
| **Backend Dev** | `.github/agents/backend-agent.instructions.md` | NestJS, Drizzle, tRPC server, BullMQ, MSSQL, PostgreSQL |

**QA Agent leads every sprint.** It assigns scoped jobs to Frontend and Backend agents, validates all output against the quality checklist, then pushes to `dev`. Frontend and Backend work in parallel where dependencies allow.

### Git Workflow

```
dev     ← DEFAULT branch — all development builds land here.
          Branch off here, PR back here. QA Agent pushes after sign-off.
main    ← PRODUCTION ONLY — tagged releases (vX.Y.Z).
          Never commit directly. Only QA merges dev → main at milestone gates.
feature/sprint-X-Y-<description>  ← work branches, off dev
```

> **Rule:** If in doubt, target `dev`. Nothing touches `main` without a QA gate.

**Commit format:** `[Sprint X] type(scope): description`

```bash
git checkout dev
git checkout -b feature/sprint-1-2-auth
# ... work ...
git commit -m "[Sprint 1] feat(auth): wire Clerk JWT guard to NestJS"
# QA validates → merges to dev
# At milestone: QA merges dev → main and tags vX.Y.Z
```

### Getting Started (local dev)

```bash
# Prerequisites: Node 20+, Docker Desktop, pnpm 9+
git clone https://github.com/kayzredman/lotris.git
cd lotris
pnpm install          # installs all workspace packages
docker compose -f docker/docker-compose.yml up -d   # start MSSQL, PostgreSQL, Redis
pnpm db:migrate       # run Drizzle migrations
pnpm dev              # start Next.js (:3000) + NestJS (:4000) + workers concurrently
```

---

_Lotris — Calm. Precise. Dependable._

---

## Licence

_To be defined — proprietary / open-source decision pending._
