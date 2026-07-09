# Lotris Mobile Pager — Scope & Investment Proposal

> **Document type:** Change management / management pitch  
> **Version:** 1.0  
> **Date:** July 2026  
> **Status:** Proposed — awaiting management approval  
> **Audience:** Executive sponsors, IT leadership, change advisory board  
> **Companion mockups:** [`mockups/12-mobile-pager-pitch.html`](../mockups/12-mobile-pager-pitch.html)

---

## 1. Executive summary

**Proposal:** Build **Lotris Pager** — a lightweight mobile application (iOS + Android) that lets support **engineers and team leads** respond to tickets when they are **away from desk and off the corporate network**.

**Problem:** Today, ticket assignment and SLA warnings only reach engineers reliably when they have the full web app open. Off-network staff miss urgent work until they return to VPN or email.

**Solution:** A focused 6-screen mobile app with **push notifications**, connected to the **existing Lotris API** — no duplicate backend, no new database platform.

**Investment ask:** ~**5–8 weeks** (1 mobile developer + backend support slices) after board approval.

**Recommendation:** Approve Phase 1 spike (2 weeks, low cost) to validate Entra mobile login and API connectivity before full build commitment.

---

## 2. Business need

### 2.1 Context

Lotris is deployed for IT help desk operations — queue management, SLA enforcement, KPI tracking, and intelligence features. The **web application** serves desk-based work well. Support teams increasingly work:

- On call / after hours  
- From home without always-on VPN  
- On the move between sites  
- With personal phones as the fastest device nearby  

### 2.2 Pain points (today)

| Scenario | Current experience | Business impact |
|----------|-------------------|-----------------|
| Ticket assigned to engineer off VPN | No alert unless web app open (browser SSE) | Delayed pickup; SLA breach risk |
| SLA warning (amber/red) | Email only for SLA path; assign events have **no email** | Engineer may miss warning until too late |
| Engineer wants to claim from queue remotely | Must open full desktop web UI on phone browser | Clunky; low adoption |
| Team lead needs to reassign urgently | Same — full admin UI on laptop | Bottleneck when lead is unavailable at desk |
| After-hours escalation | Depends on email checking habits | Inconsistent response times |

### 2.3 Strategic alignment

| Goal | How pager supports it |
|------|----------------------|
| Improve SLA compliance | Faster acknowledge → work → resolve cycle |
| Reduce mean time to respond | Push alert within seconds of assign/escalate |
| Support hybrid / remote IT | Works over HTTPS + Entra MFA — no domain join required |
| Protect on-prem investment | Reuses Lotris.Api; no parallel SaaS backend |
| Enterprise security | MDM distribution, minimal push payloads, existing Entra IdP |

---

## 3. Gap analysis (as-is vs to-be)

### 3.1 Notification channels today

| Event | Email | In-app SSE | Mobile push |
|-------|-------|------------|-------------|
| SLA warning | Yes | Yes | **No** |
| Ticket assigned | **No** | Yes (app open only) | **No** |
| Ticket escalated | **No** | Yes (app open only) | **No** |
| Ticket created (queue) | **No** | Partial | **No** |
| KPI warning | No | Yes | **No** |

**Root cause:** [`NotificationJob`](../../src/Lotris.Workers/Jobs/NotificationJob.cs) publishes ticket events to SSE only. SSE requires an active browser session — unsuitable for a pager model.

### 3.2 Client channels today

| Channel | Off-network | Mobile-optimised | Push when closed |
|---------|-------------|------------------|------------------|
| Full web app (`apps/web`) | Yes (if HTTPS reachable) | Partial (responsive) | No |
| PWA (documented aspiration) | — | — | **Not implemented** |
| Email | Yes | N/A | N/A (slow) |
| **Lotris Pager (proposed)** | Yes | Yes | **Yes** |

### 3.3 API readiness

**Already available (reuse — no reimplementation):**

| Capability | REST endpoint |
|------------|---------------|
| Login | `POST /api/v1/auth/login` |
| Microsoft Entra | `GET /api/v1/auth/microsoft/login` |
| My profile | `GET /api/v1/users/me` |
| Queue list | `GET /api/v1/queue` |
| Claim ticket | `POST /api/v1/queue/claim/{id}` |
| My / team tickets | `GET /api/v1/tickets` |
| Ticket detail | `GET /api/v1/tickets/{id}` |
| Update status | `PATCH /api/v1/tickets/{id}/status` |
| Add comment | `POST /api/v1/tickets/{id}/comments` |
| Batch reassign (lead) | `POST /api/v1/tickets/batch-reassign` |

**New backend work required (small):**

| Capability | Purpose |
|------------|---------|
| Device registration | Store FCM/APNs token per user/device |
| JWT refresh | Mobile sessions longer than web |
| Push dispatcher | Send push on existing notification events |
| Notification inbox (optional v1.1) | List recent alerts in app |

OpenAPI contract today: **130 operations** — mobile adds ~4.

---

## 4. Proposed solution

### 4.1 Product definition

**Lotris Pager** — a **thin mobile client** for field response, not a mobile clone of the full platform.

**Tagline for pitch:** *"Respond before SLA slips — from anywhere."*

### 4.2 v1 users and roles

| Role | v1 capabilities |
|------|-----------------|
| **Engineer** | Receive push alerts; view my tickets; claim from queue; update status; add comment |
| **Team Lead** | All engineer capabilities + view team queue + batch reassign |

**Out of v1 scope:** KPIs, reports, RCA wizard, knowledge base, intelligence admin, system health, audit log.

### 4.3 v1 screens (see mockups)

| # | Screen | Purpose |
|---|--------|---------|
| 1 | Login | Sign in with Microsoft (Entra) or identity credentials |
| 2 | Alerts | Push history — assigned, escalated, SLA warnings |
| 3 | My Tickets | Active assignments with status chips |
| 4 | Queue | Unclaimed team tickets — one-tap claim |
| 5 | Ticket Detail | Status transitions, comment, key fields |
| 6 | Quick Assign | Team lead — select tickets + assign engineer |

**Mockups:** Interactive HTML pitch deck at [`mockups/12-mobile-pager-pitch.html`](../mockups/12-mobile-pager-pitch.html)

### 4.4 Push events (v1) — pager-style delivery

Alerts behave like a **traditional pager**: sound, vibration, and on-screen urgency — not a silent badge update.

| Event | Push title (example) | Deep link | Pager behaviour |
|-------|---------------------|-----------|-----------------|
| `TICKET_ASSIGNED` | "Ticket assigned — INC-1042" | Ticket detail | Sound + vibrate + full-screen overlay (foreground) |
| `TICKET_ESCALATED` | "Escalated — INC-1042" | Ticket detail | Same |
| `SLA_WARNING` | "SLA warning — 15 min left" | Ticket detail | Same |

Push body contains **reference only** — no sensitive description text until user unlocks app.

---

## 5. Architecture

```
┌─────────────────┐     HTTPS + JWT      ┌──────────────────┐
│  Lotris Pager   │ ───────────────────► │   Lotris.Api     │
│  (Expo / RN)    │                      │   (existing)     │
└────────┬────────┘                      └────────┬─────────┘
         │                                        │
         │ FCM / APNs                             │ MSSQL + Redis
         ▼                                        ▼
┌─────────────────┐                      ┌──────────────────┐
│ Google / Apple  │ ◄── PushDispatcher ──│ NotificationJob  │
│ push services   │     (new, small)     │ (existing)       │
└─────────────────┘                      └──────────────────┘
```

**Design principle:** Mobile talks **only** to Lotris.Api. All business rules (FSM, queue mutex, RBAC, tenancy) stay in C# services.

### 5.1 What we explicitly will NOT build

| Alternative considered | Decision |
|---------------------|----------|
| Supabase as mobile backend | **Rejected** — duplicates MSSQL; conflicts with on-prem |
| Full mobile web app | **Rejected** — poor push reliability; not a pager |
| Native Swift + Kotlin separate apps | **Rejected** — 2× cost for same scope |
| PWA-only | **Rejected for v1** — weak iOS push; weaker MDM story |

---

## 6. Technology stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Mobile framework | **Expo (React Native)** + TypeScript | One codebase iOS/Android; aligns with web stack |
| API client | OpenAPI codegen from `docs/openapi/v1.json` | Same contract as web — single source of truth |
| Authentication | Entra OIDC + Lotris JWT + refresh tokens | IT keeps MFA in Entra; no new IdP |
| Token storage | Expo SecureStore (OS keychain) | Enterprise security baseline |
| Push (Android) | Firebase Cloud Messaging (FCM) | Industry standard |
| Push (iOS) | Apple Push Notification service (APNs) | Required for iOS |
| Push dispatch | New C# service in Lotris.Api | Hooks existing `NotificationJob` |
| Distribution | MDM / private app store / TestFlight internal | IT-controlled rollout |
| Backend changes | ~4 REST endpoints + 1 DB migration | Minimal slice in existing solution |

**No new infrastructure products** (no Supabase, no second database).

---

## 7. Security & compliance

| Control | Approach |
|---------|----------|
| Identity | Microsoft Entra with MFA (primary); identity login for lab/dev |
| Transport | TLS 1.2+ on customer `PUBLIC_BASE_URL` |
| Token storage | OS secure enclave — never plain localStorage |
| Push content | Ticket reference only; detail fetched after auth |
| App distribution | MDM or enterprise app store — not public consumer listing required |
| Device revocation | Logout + admin device token delete |
| Optional | Biometric app lock (Phase 3); certificate pinning for fixed hosts |
| LDAP | VPN-only; mobile off-network uses Entra |

**Network options for customers:**

- **Option A:** Expose Lotris on HTTPS (reverse proxy) — pager works directly  
- **Option B:** Require VPN — pager works over VPN tunnel  

Both supported; documented in IT handover addendum on approval.

---

## 8. Scope boundaries

### 8.1 In scope (v1)

- Expo mobile app (iOS + Android)  
- Push for assign, escalate, SLA warning  
- Six core screens (see §4.3)  
- Device registration API  
- JWT refresh flow  
- Engineer + Team Lead RBAC  
- MDM deployment guide  

### 8.2 Out of scope (v1)

- KPI dashboards on mobile  
- Reports, RCA, knowledge, intelligence admin  
- Offline ticket editing / sync queue  
- SMS pager fallback  
- Public App Store consumer launch (optional later)  
- Replacing desktop web application  

### 8.3 Future (v2+ backlog)

- New ticket in queue push (team broadcast)  
- Notification preferences per user  
- SMS/email fallback toggle  
- Apple Watch / Wear OS glance  
- Attachment capture from camera  

---

## 9. Build plan & timeline

### Phase 0 — Approval & spike (2 weeks) — **recommended gate**

| Deliverable | Exit criteria |
|-------------|---------------|
| Management sign-off on this document | Board approval recorded |
| Expo spike: Entra login on device | JWT received over HTTPS |
| One ticket status update from phone | API round-trip proven |
| Entra redirect URIs documented | IT can pre-register app |

**Cost:** Low — validates feasibility before full investment.

### Phase 1 — Foundation (2–3 weeks)

- Expo project scaffold (`apps/mobile/`)  
- OpenAPI client + secure token storage  
- Backend: refresh tokens + `device_tokens` migration  
- Screens: Login, My Tickets, Ticket Detail  

### Phase 2 — Pager core (2–3 weeks)

- FCM + APNs push dispatcher in API  
- Wire `NotificationJob` → push for assign/escalate/SLA  
- Screens: Alerts, Queue, claim flow  
- Team Lead: Quick Assign (batch reassign)  

### Phase 3 — Hardening & rollout (1–2 weeks)

- Biometric app lock  
- Device revoke on logout  
- IT handover mobile section (APNs/FCM keys, Entra URIs)  
- MDM package / internal store build  
- Smoke test script  

### Summary timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0 (spike) | 2 weeks | 2 weeks |
| Phase 1 | 2–3 weeks | 4–5 weeks |
| Phase 2 | 2–3 weeks | 6–8 weeks |
| Phase 3 | 1–2 weeks | **7–10 weeks** total |

*Assumes 1 mobile developer + part-time backend support; parallel QA in Phase 2–3.*

---

## 10. Resource & investment estimate

| Resource | Allocation | Notes |
|----------|------------|-------|
| Mobile developer (Expo/RN) | 0.8–1.0 FTE for 7–10 weeks | Primary build |
| Backend developer | 0.2 FTE for 3–4 weeks | Push + device APIs |
| QA | 0.2 FTE for 2 weeks | Device matrix, push tests |
| IT / security review | 1–2 sessions | Entra, MDM, APNs/FCM keys |
| Apple Developer / FCM | Customer or project account | ~$99/yr Apple; FCM free |

**Ongoing cost:** Push infrastructure is per-customer config (APNs key, FCM project) — no Lotris cloud dependency for on-prem.

---

## 11. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| APNs / FCM setup delays | Medium | Medium | Document in IT handover; start early in Phase 2 |
| Customer blocks external push | Low | High | Offer VPN-only + email fallback; FCM is outbound-only |
| Entra mobile redirect complexity | Medium | Medium | Phase 0 spike de-risks |
| Scope creep (full mobile app) | High | High | Strict v1 screen list; mockups as contract |
| JWT expiry frustrates users | Medium | Medium | Refresh tokens in Phase 1 |

---

## 12. Success criteria

| Metric | Target (90 days post-rollout) |
|--------|------------------------------|
| Engineer adoption | ≥70% of field engineers install via MDM |
| Pickup time (mobile-assigned tickets) | ≥20% reduction vs baseline |
| SLA breach rate (pickup) | Measurable downward trend |
| Push delivery latency | <60 seconds from assign event |
| Security audit | No critical findings on token/push review |

---

## 13. Dependencies

| Dependency | Owner | Required by |
|------------|-------|-------------|
| Lotris HTTPS endpoint reachable off-network | Customer IT | Phase 0 |
| Entra app registration (mobile redirect URIs) | Customer IT | Phase 0 |
| Apple Developer Program (APNs key) | Customer IT | Phase 2 |
| FCM project (Android) | Customer IT | Phase 2 |
| MDM distribution path | Customer IT | Phase 3 |
| Management approval | Sponsor | Phase 0 start |

---

## 14. Decision requested

| # | Decision | Options |
|---|----------|---------|
| 1 | Proceed with Lotris Pager? | Approve / Defer / Reject |
| 2 | Approve Phase 0 spike (2 weeks)? | Yes (recommended) / Skip to full build / No |
| 3 | v1 audience confirmed? | Engineers + Team Leads (as scoped) |
| 4 | Distribution model? | MDM enterprise (recommended) / Public stores later |

---

## 15. Approvals

| Role | Name | Date | Decision |
|------|------|------|----------|
| Executive sponsor | | | |
| IT director | | | |
| Change advisory board | | | |
| Product owner | | | |

---

## 16. References

| Document | Purpose |
|----------|---------|
| [GLOSSARY.md](GLOSSARY.md) | Abbreviations & terms used in this proposal |
| [BRD.md](BRD.md) | Current platform business requirements |
| [IT-HANDOVER.md](IT-HANDOVER.md) | Production architecture & on-prem install |
| [API.md](API.md) | REST API index (130 operations) |
| [MOBILE-IMPLEMENTATION-PHASES.md](MOBILE-IMPLEMENTATION-PHASES.md) | Phased build plan (prerequisites → rollout) |
| [mockups/12-mobile-pager-pitch.html](../mockups/12-mobile-pager-pitch.html) | Interactive UI mockups |
| Shareable pack | Run `pnpm docs:release:pdf` → `docs/dist/` (HTML + PDF) |
| [.cursor/plans/mobile_pager_app.plan.md](../.cursor/plans/mobile_pager_app.plan.md) | Technical planning notes |

---

_Lotris Mobile Pager — Scope v1.0 — July 2026 — For management discussion only; not a committed delivery until approved._
