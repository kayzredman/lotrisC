# Lotris — Design System & UX Standards

> Last updated: June 2026  
> Used during **Phase 5** (frontend migration) with the **ui-ux-pro-max** Cursor skill.

This document bridges the original mockups, the live v2 CSS implementation, and ShadCN components. It is the UX source of truth going forward — mockups remain read-only reference.

---

## 1. When to use ui-ux-pro-max

The **ui-ux-pro-max** skill (`~/.agents/skills/ui-ux-pro-max/SKILL.md`) **must** be invoked when:

- Designing or refactoring any page or UI component
- Changing auth, forms, navigation, or responsive layout
- Reviewing accessibility, contrast, touch targets, or loading states
- Choosing typography, spacing, or interaction animation

**Skip the skill for:** API, database, Docker, Hangfire, or other non-visual work.

---

## 2. Brand (preserve — do not rebrand)

| Token | Value | Usage |
|-------|-------|--------|
| Brand indigo | `#4F46E5` | Primary CTAs |
| Hover indigo | `#4338CA` | Button hover |
| Dark background | `#0C0E1A` | App shell, auth panels |
| Panel dark | `#111425` | Sidebar, cards |
| Panel border | `#1E2235` | Borders |
| Green (resolved) | `#10B981` | Success, resolved tickets |
| Amber (active) | `#F59E0B` | In progress |
| Red (critical) | `#EF4444` | P1 / critical |

**Components:** `apps/web/components/brand/lotris-mark.tsx` — `LotrisMark`, `LotrisLogo`  
**Assets:** `apps/web/public/brand/`  
**Reference:** README Brand & Design section

---

## 3. Dual styling system (consolidate during Phase 5)

| Layer | Location | Usage |
|-------|----------|--------|
| **v2 CSS classes** | `apps/web/app/globals.css` | `v2-card`, `v2-btn`, `v2-stats-grid` — primary in built pages |
| **Tailwind + ShadCN** | `packages/ui/`, component-level | New components, forms, dialogs |
| **Inline styles** | `/monitor` only | Do not extend this pattern |

**Phase 5 goal:** New work uses ShadCN + semantic Tailwind tokens mapped to brand colours above. Gradually migrate v2 classes where pages are touched — no big-bang CSS rewrite.

---

## 4. UX priority checklist (from ui-ux-pro-max)

Apply in order when reviewing or building UI:

| Priority | Check |
|----------|--------|
| 1 — Accessibility | Contrast ≥ 4.5:1, focus rings, aria-labels on icon buttons, keyboard nav |
| 2 — Touch | Min 44×44px targets, 8px+ spacing, loading feedback on actions |
| 3 — Performance | Reserve layout space (avoid CLS), lazy-load heavy charts |
| 4 — Consistency | Match admin-panel / SaaS dashboard patterns; SVG icons not emoji |
| 5 — Responsive | Mobile-first; 375px / 768px / 1280px breakpoints |
| 6 — Typography | Base 16px, line-height 1.5, semantic colour tokens |
| 7 — Animation | 150–300ms; respect `prefers-reduced-motion` |
| 8 — Forms | Visible labels, inline errors, progressive disclosure |
| 9 — Navigation | Predictable back, bottom nav ≤ 5 items on mobile |
| 10 — Charts | Legends, tooltips, don't rely on colour alone |

---

## 5. Responsive breakpoints

| Breakpoint | Layout |
|------------|--------|
| **Desktop 1280px+** | Full sidebar, table views, multi-column |
| **Tablet 768–1279px** | Icon rail sidebar, horizontal scroll tables |
| **Mobile <768px** | Bottom nav, tables → card stacks, full-screen drawers |

Matches `.github/agents/frontend-agent.instructions.md`.

---

## 6. Phase 5 UX pass — page list

| Page | Route | Focus |
|------|-------|--------|
| Auth hub | `/login` | Multi-provider (Entra / Identity / LDAP) |
| Onboarding | `/onboarding` | First-run admin wizard |
| Dashboard | `/dashboard` | Stat cards, charts, engineer perf |
| Queue | `/queue` | Claim flow, mobile cards |
| Tickets | `/tickets` | Drawer, status bar, SLA badges |
| KPI | `/kpis`, `/kpis/agreements`, `/kpis/my-agreement` | Forms, sign-off |
| System health | `/system-health` | Ops dashboard, SSE |
| Landing | `/` | Brand, CTA |
| Request access | `/request-access` | Public form |
| Monitor | `/monitor` | Public wall (keep inline-style pattern) |

Record decisions and screenshots in sprint reviews under `docs/reviews/`.

---

## 7. Mockups (read-only)

Do not edit files in `mockups/` during builds. Use as visual reference only:

- `mockups/style-v2.css` — design tokens origin
- `mockups/01-login-v2.html` through `10-sysadmin-ops-v2.html`

---

## 8. Forms & auth UI (Phase 5)

Replacing Clerk `<SignIn />` / `<SignUp />`:

- Provider buttons driven by `NEXT_PUBLIC_AUTH_PROVIDERS`
- Identity: email + password with visible labels and inline validation
- Entra: OIDC redirect button with clear "Sign in with Microsoft" copy
- LDAP: username + password (or SSO button if configured)
- Error states: toast + inline field errors; never silent failure
- Loading states on all submit buttons

---

_Lotris design system — clarity for every surface._
