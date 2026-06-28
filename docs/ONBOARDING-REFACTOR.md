# Lotris — Onboarding Refactor Decisions

> **Status: DECIDED** — June 2026  
> Applies to: C# refactor Phase 5 (frontend + onboarding API)  
> Context: Sprint 20 wizard gaps, on-prem bootstrap, hybrid auth

---

## Summary

Keep the **5-step wizard UX** but fix the **UI/API honesty gap**, tie it to **on-prem bootstrap**, and split **installer config** from **tenant admin wizard**. Onboarding APIs move to OpenAPI REST under `/api/v1/onboarding/*` with the same RBAC.

---

## 1. Persist what the UI promises

**Decision: Phased honesty — persist critical path in Phase 5; defer cosmetic fields to Phase 5.1**

| Step | Persist in Phase 5 | Defer / simplify UI |
|------|-------------------|---------------------|
| **1 Org** | `name`, `slug`, `timezone`, `reportBrandName` → tenant + `analytics.ReportConfig` | Logo upload → Phase 5.1 (file storage); brand colour → use Lotris defaults until theme table exists |
| **2 Teams** | `name`, `description`, `leadUserId` via full team create API | UI-only delete → call `DELETE /admin/teams/:id` or disallow remove during wizard |
| **3 Invite** | Provider-specific (see §3) | — |
| **4 SLA** | Full priority matrix → `SlaConfigs` per team or tenant; `maxOpenTickets`, queue order, auto-assign flag → `QueueConfig` | Escalation target team → wire to existing team routing |
| **5 KPI** | Template → DRAFT definitions (keep) | `reviewFrequency` + `reportEmail` → seed `ReportSchedules` or `ReportConfig.defaultRecipients` |

**Principle:** Never show a field in the wizard that is not saved on Continue unless labeled “Preview only” or removed.

**Anti-pattern rejected:** Stripping the UI down to match today’s minimal API — the wizard is the product’s first impression for on-prem buyers; gutting it wastes Sprint 20 UX work.

---

## 2. On-prem first run

**Decision: Two-track bootstrap — installer skip + admin wizard**

| Track | Who | Behavior |
|-------|-----|----------|
| **A — Automated install** | Platform / installer running `deploy/scripts/bootstrap.sh` | `--skip-onboarding` or env `LOTRIS_SKIP_ONBOARDING=true` seeds tenant, admin user, default SLA, default `AnalyticsJobConfig`; sets `onboardingCompletedAt` immediately |
| **B — First admin login** | Human ADMIN after install without skip | `onboardingCompletedAt` NULL → redirect to `/onboarding` (current guard) |

**Default for Docker Compose demo:** Track B (wizard runs) so evaluators see the full flow.

**Default for production on-prem:** Document Track A in install guide; wizard still reachable from **Admin → Organisation → Run setup wizard again** (see §4).

`bootstrap.sh` must seed:
- Tenant + admin (Identity provider)
- One default team (“General Support”)
- Tenant SLA + queue defaults
- `AnalyticsJobConfig` platform row (5 min rollup, 2× daily batch)

---

## 3. Identity without Clerk (Step 3 — Invite)

**Decision: Provider-aware Step 3 — one UI, three backends**

| Auth provider enabled | Step 3 behavior |
|----------------------|-----------------|
| **ASP.NET Identity** | `POST /admin/users` creates local user + MailKit sends set-password / welcome email; same as today’s intent |
| **Entra ID** | Copy: “Users sign in with Microsoft — add emails to allow-list or rely on Entra group sync.” Optional: store `pendingInvites` emails; JIT provision on first OIDC login. **No Clerk ticket flow.** |
| **LDAP/AD** | Copy: “Users authenticate with domain credentials — ensure AD accounts exist.” Optional CSV import of `samAccountName` → map to Lotris user stub. **No email invite required.** |

Step 3 remains **skippable**. When only LDAP is enabled, rename step to **“Add users (optional)”** and hide email chip input if LDAP-only.

**Rejected:** Keeping Clerk invite mechanics in on-prem builds.

---

## 4. Re-run onboarding

**Decision: Soft re-run — wizard without data destruction**

- **Admin → Organisation → “Run setup wizard again”** (`ADMIN` / `SUPERADMIN`)
- Sets `onboardingCompletedAt = NULL`; does **not** delete teams, users, tickets, or KPIs
- Wizard opens at Step 1 with **existing values pre-filled** from API (new `GET /onboarding/state`)
- Audit log: `ONBOARDING_REOPENED`

**Rejected:** Hard reset that deletes tenant data from the wizard.

---

## 5. Link onboarding Step 4 to analytics job config

**Decision: Seed defaults in Step 4; tune in System Health**

Step 4 **“SLA & queue”** saves operational SLA/queue config.

Add collapsible **“Reporting & analytics schedule (defaults)”** subsection:

| Field | Default | Stored in |
|-------|---------|-----------|
| Dashboard rollup interval | 5 min | `AnalyticsJobConfig.incrementalRollupIntervalMinutes` |
| Daily report batch times | 08:00, 18:00 UTC | `AnalyticsJobConfig.dailyBatchTimesUtc` |
| Dashboard cache TTL | 30s | `AnalyticsJobConfig.dashboardCacheTtlSeconds` |

Copy: *“Advanced job tuning available in System Health → Analytics & ETL Jobs.”*

Sysadmins can override anytime on `/system-health` (DATABASE-STRATEGY.md §11).

---

## 6. Completion criteria

**Decision: Server-enforced minimum bar**

`POST /onboarding/complete` returns **400** unless:

1. Tenant has `name` and `slug`
2. `teamCount >= 1` (active team in MSSQL)
3. Caller is `ADMIN` or `SUPERADMIN`

Steps 3, 4, 5 remain **skippable** in the UI; if skipped, bootstrap defaults apply:

- Step 4 skipped → tenant SLA defaults (1h pickup / 4h resolution from Critical-equivalent)
- Step 5 skipped → no KPI definitions created (admin adds later)

**Rejected:** Marking complete on KPI save alone while zero teams exist (possible today if user manipulates client state).

---

## 7. Block non-admins from `/onboarding`

**Decision: Defense in depth**

| Layer | Rule |
|-------|------|
| **API** | All `/api/v1/onboarding/*` → `403` unless role is `ADMIN` or `SUPERADMIN` |
| **Next.js** | Server component or middleware on `/onboarding`: if authenticated and not admin → redirect `/dashboard` |
| **Guard** | Keep existing `OnboardingGuard` (redirect admins to wizard when PENDING) |

Engineers never see the wizard URL content.

---

## Phase assignment

| Phase | Work |
|-------|------|
| **0** | `Tenants.onboardingCompletedAt`; seed logic in bootstrap |
| **4** | `AnalyticsJobConfig` defaults (linked from onboarding seed) |
| **5** | Full onboarding REST API, wizard rewrite (OpenAPI client), ui-ux-pro-max pass, provider-aware Step 3, `GET /onboarding/state`, completion validation |
| **6** | `bootstrap.sh --skip-onboarding`; env template docs |

---

## Parity checklist (additions)

- [ ] Step 1 timezone + report brand name persist and reload on `GET /onboarding/state`
- [ ] Step 2 team lead + description persist; remove team deletes in DB
- [ ] Step 4 full SLA matrix + queue config persist
- [ ] Step 5 report email / frequency persist or UI removed
- [ ] `complete` rejected when `teamCount === 0`
- [ ] ENGINEER on `/onboarding` → redirect dashboard
- [ ] Identity / Entra / LDAP Step 3 variants render per `NEXT_PUBLIC_AUTH_PROVIDERS`
- [ ] Re-run wizard from Admin without clearing operational data

---

_Related: [REFACTOR.md](REFACTOR.md) · [DATABASE-STRATEGY.md](DATABASE-STRATEGY.md) · Sprint 20 in [SPRINTS.md](SPRINTS.md)_
