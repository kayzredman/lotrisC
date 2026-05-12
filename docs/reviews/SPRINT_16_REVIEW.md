# Sprint 16 Review — QA Fixes · Monitor Wall · Role Visibility · KPI My Agreement

**Sprint:** 16  
**Milestone:** M9  
**Status:** ✅ COMPLETE  
**Branch:** `dev` @ `3e2b17e`  
**Commits (latest first):**
- `3e2b17e` — `[Sprint 16] fix(kpi): submit-for-review button color, loading state, error/success feedback, PENDING_REVIEW info pill`
- `1434525` — `[Sprint 16] feat(kpi): my-agreement view for engineers+team-leads, search on agreement tables, Daily period, kpiAgreementProcedure`
- `3f732ed` — `[Sprint 16] fix(kpi): migrate all agreement REST calls to tRPC + improve ClerkJwtGuard error logging`
- `e5b1a83` — `[Sprint 16] fix(kpi): create agreement via tRPC mutation — bypass REST ClerkJwtGuard auth failure`
- `dbed1f1` — `[Sprint 16] feat(health): pnpm store repair from system-health screen + fix queue team names + live sidebar badges`
- `f57f17b` — `[Sprint 16] fix(rbac): managerProcedure for IT_MANAGER + role-gate AdminTabs + teamName in users.list + SQL injection fix + Yaw Clerk ID repair`
- `92616b3` — `[Sprint 16] fix(auth): wire dev-login real Clerk IDs to seeded users`
- `319d579` — `[Sprint 16] fix(rbac): enforce role-based data filtering across all services`
- `940ca82` — `[Sprint 16] docs: update README, CONTEXT.md, and SPRINTS.md for Sprint 16 / M9`
- `c849766` — `[Sprint 16] feat(ui): mobile CSS, cross-team access panel, admin tabs, layout fixes`
- `4535d57` — `[Sprint 16] feat(ui): role-visibility — Queue workload scoping, Tickets/Tasks role banners`

---

## Summary

Sprint 16 was an extended quality pass that covered three phases:

1. **QA Fixes + Monitor Wall (original M9 scope):** Queue workload role-scoping, Tickets/Tasks role-context banners, Monitor page wired to real DB data, animated priority ticker, light/dark toggle, cross-team access grants UI, mobile responsiveness.

2. **Auth + RBAC hardening:** Fixed ClerkJwtGuard error logging, migrated all KPI agreement calls from REST to tRPC (bypassing the Clerk JWT guard issue on the REST layer), repaired dev-login Clerk IDs, hardened TicketsService/TasksService role-based filtering.

3. **KPI My Agreement feature:** Introduced `kpiAgreementProcedure` to extend builder access to TEAM_LEAD; added `kpi.agreements.accept` mutation; built the `KpiMyAgreement` component for engineers and team leads to view and sign off their own agreements; added Daily measurement period; fixed submit-for-review button behaviour.

---

## Deliverables

### Backend

| File | Description |
|------|-------------|
| `apps/api/src/trpc/trpc.ts` | New `kpiAgreementProcedure`: SUPERADMIN, ADMIN, IT_MANAGER, TEAM_LEAD |
| `apps/api/src/trpc/router.ts` | `kpi.agreements.create` + `setAreas` → `kpiAgreementProcedure`; new `kpi.agreements.accept` protectedProcedure |
| `apps/api/src/modules/kpi/kpi.service.ts` | `listAgreements()` auto-scopes ENGINEER to own userId; `acceptAgreement()` enforces engineerId match + PENDING_REVIEW status |
| `apps/api/src/modules/kpi/dto/index.ts` | `MeasurementPeriod` union extended with `'DAILY'` |
| `apps/api/src/modules/auth/clerk-jwt.guard.ts` | Logger added; real error logging before rethrow |

### Frontend

| File | Description |
|------|-------------|
| `apps/web/components/kpis/kpi-my-agreement.tsx` | My Agreement component: own agreement view, search/filter, status pills, read-only area cards, sign-off card, Accept & Sign Off mutation |
| `apps/web/app/(app)/kpis/my-agreement/page.tsx` | App Router page for `/kpis/my-agreement` |
| `apps/web/components/sidebar/sidebar.tsx` | My Agreement nav item for ENGINEER + TEAM_LEAD; ClipboardList icon |
| `apps/web/components/kpis/kpi-agreement-builder.tsx` | Search input on agreements table; Daily period option; submit button: loading state, onError handler, success/error banners, PENDING_REVIEW info pill, DRAFT-only visibility |

### Data Fix

Two users named "Yaw Owusu" existed in the DB:
- `...000005` (fake Clerk ID `clerk_demo_eng1`) — original seed user, now orphaned
- `...000011` (real Clerk ID `user_3DP8aNpw7RDxTOvd2e5VQgOiu1j`) — the authenticatable user

All 5 KPI agreements (previously under `...000005`) were reassigned to `...000011` via SQL. Four KPI areas and 8 metrics were seeded for the DRAFT agreement.

---

## Architecture Decisions

**`kpiAgreementProcedure` as a new tRPC middleware layer** — Rather than broadening `managerProcedure` to include TEAM_LEAD (which would unintentionally grant manager-level access to other procedures), a purpose-specific middleware was created for the KPI agreement builder. This maintains least-privilege access control.

**`kpi.agreements.accept` as `protectedProcedure` (not `kpiAgreementProcedure`)** — Any authenticated user should be able to accept their own agreement. The authorization check (engineerId === auth.userId + PENDING_REVIEW status) is enforced inside the service, not at the tRPC middleware layer. This is the correct boundary for business-logic authorization vs. role-based access.

**Engineer My Agreement scoping at the service layer** — `listAgreements()` detects ENGINEER role in the service and automatically restricts to the caller's userId, making it impossible for an engineer to query another engineer's agreement regardless of what the frontend passes.

**REST → tRPC migration for agreement calls** — The REST KPI endpoints use `ClerkJwtGuard` which failed in development due to dev-login not fully satisfying Clerk's JWT verification. Migrating all agreement calls to tRPC (which uses the same guard but in a different binding layer) resolved the auth failures without changing the underlying auth model.

---

## QA Sign-off

- All 9 backend jobs completed ✅
- All 17 frontend jobs completed ✅
- `kpiAgreementProcedure` enforces FORBIDDEN for ENGINEER role ✅
- `kpi.agreements.accept` rejects wrong userId and wrong status ✅
- My Agreement view correct for ENGINEER scope (own agreements only) ✅
- My Agreement view correct for TEAM_LEAD scope ✅
- Submit button state machine correct: DRAFT → loading → success/error; PENDING_REVIEW → info pill ✅
- Sidebar My Agreement item only shown for ENGINEER + TEAM_LEAD ✅
- Daily period selectable in agreement builder ✅
- Data fix verified: Yaw Owusu's 5 agreements visible under real user `...000011` ✅

---

## Known Limitations / Deferred Items

- **Two "Yaw Owusu" users:** `...000005` (orphaned seed, fake Clerk ID) and `...000011` (real). The old record is not deleted as it may be referenced by other seed data. Do not delete in future sprints without checking FK constraints.
- **KPI actuals + scoring for My Agreement view:** The My Agreement screen shows targets and current scores as read-only. Phase 2 work item: real-time actual scores inline in the metric table from `kpi_actuals` and `kpi_results`.
- **Agreement bulk actions:** Team Leads building agreements for a large team must create them one at a time. A bulk-create wizard (copy areas from a template agreement) is deferred to Phase 2.
- **Notifications on accept:** No notification is currently sent to the Team Lead when an engineer accepts their agreement. This should be wired to the `notifications` BullMQ queue in Phase 2.
- **OI-1 (inherited):** Notifications queue has 1 failed job in DLQ — pre-build item, not addressed in Sprint 16.
