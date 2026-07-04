# Lotris — Project closeout & repository hygiene

> **Purpose:** Track repo tidiness before treating the Phase 8 release as closed  
> **Date:** July 2026  
> **Status:** In progress

---

## 1. Completed closeout actions

| Action | Status |
|--------|--------|
| [BRD.md](BRD.md) — business requirements | ✅ |
| [IT-HANDOVER.md](IT-HANDOVER.md) — CIO/IT handover | ✅ |
| HTML preview generator (`pnpm docs:release`) | ✅ |
| `docs/TEAMLIST.xlsx` removed from git; seed unchanged | ✅ — see [TEAMLIST.README.md](TEAMLIST.README.md) |
| Research docs removed | ✅ — `PHASE-8-RESEARCH.md`, `RCA_RESEARCH_RAW.md` deleted |
| OpenAPI synced (130 ops) | ✅ |
| On-prem smoke green | ✅ |
| Merged to `main` | ✅ |

---

## 2. Remaining (optional)

| Item | Recommendation |
|------|----------------|
| `docs/reviews/SPRINT_*_REVIEW.md` | Archive or delete (historical sprint reviews) |
| `docs/STAGING.md` | Archive — superseded by on-prem install |
| `REFACTOR.md` body | Internal engineering history — not for customer handover packs |
| BRD / IT handover sign-off rows | Business owner fills in |

---

## 3. Preview release docs

```bash
pnpm docs:release        # HTML → docs/dist/
pnpm docs:release:pdf    # HTML + PDF (requires Chrome)
```

Open `docs/dist/index.html` in a browser. Use Print → Save as PDF if headless PDF fails.

**Do not commit `docs/dist/`** — gitignored; generate locally for review.

---

## 4. Closeout gate

| # | Criterion | Status |
|---|-----------|--------|
| 1 | BRD reviewed (HTML/PDF) | ⏳ |
| 2 | IT handover reviewed (HTML/PDF) | ⏳ |
| 3 | Doc pack committed to `dev` → `main` | ⏳ After review |
| 4 | Customer sign-off on BRD | ⏳ Business |

---

_Lotris project closeout — July 2026._
