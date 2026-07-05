# Lotris — Glossary & Abbreviations

> **Purpose:** Quick reference for acronyms and terms used across Lotris documentation  
> **Version:** 1.0 · July 2026  
> **Use with:** [BRD.md](BRD.md) · [IT-HANDOVER.md](IT-HANDOVER.md) · [MOBILE-PAGER-SCOPE.md](MOBILE-PAGER-SCOPE.md) · [API.md](API.md) · [HANDOFF.md](HANDOFF.md)

---

## How to use this page

Terms below appear in release docs, IT handover, mobile pager proposal, and developer guides. For the **shareable HTML/PDF pack**, open **`docs/dist/GLOSSARY.html`** (generate via `pnpm docs:release:pdf`).

---

## A

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **AD** | Active Directory | Microsoft directory service; LDAP auth option for on-prem |
| **API** | Application Programming Interface | Lotris REST backend (`src/Lotris.Api`) — OpenAPI at `/openapi` |
| **APNs** | Apple Push Notification service | Apple’s push delivery for iOS (proposed mobile pager) |
| **ASP.NET** | Active Server Pages .NET | Microsoft web framework; Lotris API is ASP.NET Core 9 |

---

## B

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **BRD** | Business Requirements Document | [`docs/BRD.md`](BRD.md) — as-built business scope |
| **BaaS** | Backend as a Service | Cloud backend platforms (e.g. Supabase) — **not used** in Lotris |

---

## C

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **CAB** | Change Advisory Board | Governance group reviewing proposals (e.g. mobile pager scope) |
| **CIO** | Chief Information Officer | Primary audience for [`IT-HANDOVER.md`](IT-HANDOVER.md) |
| **CORS** | Cross-Origin Resource Sharing | Browser security; `CORS_ALLOWED_ORIGINS` must match public URL |

---

## E

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **EF** | Entity Framework | .NET ORM; migrations in `Lotris.Infrastructure` |
| **EF Core** | Entity Framework Core | Same as EF — database migrations alongside legacy SQL scripts |
| **Entra ID** | Microsoft Entra ID | Azure AD successor; OIDC login (“Sign in with Microsoft”) |
| **ETL** | Extract, Transform, Load | Analytics rollup jobs; admin panel at `/ops` → Analytics & ETL |
| **Expo** | Expo (React Native) | Proposed mobile framework for Lotris Pager app |

---

## F

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **FCM** | Firebase Cloud Messaging | Google push delivery for Android (proposed mobile pager) |
| **FSM** | Finite State Machine | Ticket status transitions (NEW → … → CLOSED); enforced in API |
| **FTUE** | First-Time User Experience | Onboarding wizard for new tenants |

---

## H

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **HTTPS** | HTTP Secure | TLS-encrypted web traffic; required for off-network mobile access |
| **Hangfire** | Hangfire | .NET background job scheduler; SLA, reports, ETL, notifications |

---

## I

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **IMAP** | Internet Message Access Protocol | Email poller for ticket intake |
| **ITIL** | IT Infrastructure Library | IT service management framework; Problem/RCA concepts |
| **ITSM** | IT Service Management | Broader discipline (tickets, problems, changes) |

---

## J

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **JWT** | JSON Web Token | Auth token after login; `Authorization: Bearer …` on API calls |

---

## K

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **KCS** | Knowledge-Centered Service | Knowledge base practices; Ask Knowledge Base feature |
| **KEDB** | Known Error Database | Published known errors from RCA workflow |
| **KPI** | Key Performance Indicator | Performance metrics; 3-layer model (definitions → assignments → agreements) |

---

## L

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **LDAP** | Lightweight Directory Access Protocol | Directory auth; typically VPN-only for mobile |
| **LLM** | Large Language Model | AI providers (OpenAI, Claude, Azure) for intelligence features |

---

## M

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **MDM** | Mobile Device Management | Enterprise phone deployment (Intune, etc.); recommended for Lotris Pager |
| **MFA** | Multi-Factor Authentication | Entra security requirement for sign-in |
| **MSSQL** | Microsoft SQL Server | Primary database (operational + analytics + Hangfire) |
| **MVP** | Minimum Viable Product | Smallest shippable feature set (e.g. Phase 8 MVP) |

---

## O

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **OIDC** | OpenID Connect | Protocol for Entra / Microsoft login |
| **OpenAPI** | OpenAPI Specification | Machine-readable API contract; `docs/openapi/v1.json` |
| **Ops** | Operations | SysAdmin console at `/ops` (health, ETL jobs) |

---

## P

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **PDF** | Portable Document Format | Report output format |
| **PKCE** | Proof Key for Code Exchange | OAuth security extension for mobile Entra login |
| **PWA** | Progressive Web App | Installable web app; documented aspiration, **not yet implemented** |
| **RBAC** | Role-Based Access Control | Permissions by role (ENGINEER, TEAM_LEAD, ADMIN, etc.) |
| **RCA** | Root Cause Analysis | Investigation workflow; DRAFT → IN_REVIEW → APPROVED → PUBLISHED |
| **RAG** | Retrieval-Augmented Generation | Qdrant + knowledge search feeding AI answers |
| **REST** | Representational State Transfer | HTTP API style; all `/api/v1/*` endpoints |
| **RN** | React Native | Mobile UI framework (via Expo for pager proposal) |

---

## Q

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **QA** | Quality Assurance | Test gates, smoke scripts, merge certification |

---

## S

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **SaaS** | Software as a Service | Cloud subscription model; Stripe/billing **out of scope** for on-prem |
| **Scalar** | Scalar API Reference | Interactive API docs UI at `/openapi` |
| **SLA** | Service Level Agreement | Pickup and resolution time targets; breach warnings |
| **SSE** | Server-Sent Events | Live one-way server → browser stream; `/api/v1/notifications/sse` — **in-app only**, not mobile push |
| **SMTP** | Simple Mail Transfer Protocol | Outbound email for notifications and reports |

---

## T

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **TLS** | Transport Layer Security | Encryption for HTTPS |
| **tRPC** | TypeScript RPC | Legacy NestJS internal API — **decommissioned**; replaced by REST |

---

## V

| Term | Stands for | Meaning in Lotris |
|------|------------|-------------------|
| **VPN** | Virtual Private Network | Optional access path to on-prem Lotris instead of public HTTPS |

---

## Product & role terms

| Term | Meaning |
|------|---------|
| **Lotris Pager** | Proposed lightweight mobile app for engineers/leads (see [`MOBILE-PAGER-SCOPE.md`](MOBILE-PAGER-SCOPE.md)) |
| **On-prem** | Customer-hosted Docker deployment ([`deploy/INSTALL.md`](../deploy/INSTALL.md)) |
| **Queue** | Team ticket pool before engineer assignment |
| **Tenant** | Isolated organisation; all data scoped by `tenantId` |
| **Team Lead** | Role: queue oversight, batch assign, team KPI |
| **Engineer** | Role: claim tickets, resolve, personal KPI agreement |
| **Monitor wall** | Public `/monitor` display — no login |
| **Intelligence** | AI/knowledge features (Qdrant, providers, Q&A) |
| **Parity** | REST API equivalence vs legacy tRPC ([`PARITY-AUDIT.md`](PARITY-AUDIT.md)) |

---

## Ticket status abbreviations

| Status | Meaning |
|--------|---------|
| **NEW** | Ticket created, not yet routed |
| **TEAM_ASSIGNED** | Routed to a team |
| **UNASSIGNED** | In team queue, no engineer |
| **ASSIGNED** | Engineer owns ticket |
| **IN_PROGRESS** | Actively being worked |
| **ESCALATED** | Priority/visibility raised |
| **RESOLVED** | Fix applied, pending close |
| **CLOSED** | Complete |

---

## Related documents

| Document | Link |
|----------|------|
| Documentation pack index | Run `pnpm docs:release:pdf` → `docs/dist/index.html` |
| API reference | [API.md](API.md) |
| IT handover | [IT-HANDOVER.md](IT-HANDOVER.md) |
| Mobile pager proposal | [MOBILE-PAGER-SCOPE.md](MOBILE-PAGER-SCOPE.md) |

---

_Lotris Glossary v1.0 — July 2026. Add new terms here when docs introduce abbreviations._
