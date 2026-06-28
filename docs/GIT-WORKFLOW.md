# Lotris — Git Workflow

> **Status: ACTIVE** — June 2026  
> **Canonical remote:** [github.com/kayzredman/lotrisC](https://github.com/kayzredman/lotrisC.git)  
> **Legacy remote:** [github.com/kayzredman/lotris](https://github.com/kayzredman/lotris.git) (Sprint 1–23 NestJS history — read-only reference)

---

## Branch model

```
main          ← production-ready only. QA gate + tests green + tagged releases.
  ↑ merge (QA only)
dev           ← DEFAULT. All day-to-day work lands here first.
  ↑ merge (QA after review)
feature/*     ← optional short-lived branches off dev for large slices
```

| Branch | Purpose | Who merges | Direct commits? |
|--------|---------|------------|-----------------|
| **`dev`** | Integration — NestJS today; C# refactor phases 0–7 | QA Agent after CI green | Yes (via PR or QA push) |
| **`main`** | Production / on-prem release tags | QA Agent at milestone only | **Never** — merge from `dev` only |
| **`feature/phase-X-*`** | Large isolated work (optional) | QA → `dev` | Developers/agents |

**Rule:** If in doubt, target **`dev`**. Nothing reaches **`main`** without QA sign-off and a green pipeline.

---

## Remote: lotrisC

The C# refactor and on-prem track use **`lotrisC`** as the single canonical GitHub repository.

| Remote | URL | Role |
|--------|-----|------|
| **`origin`** | `https://github.com/kayzredman/lotrisC.git` | Push/pull target |
| **`legacy`** (optional) | `https://github.com/kayzredman/lotris.git` | Fetch-only; preserve Sprint 1–23 history |

`lotrisC` is currently **empty** on GitHub — first push establishes `dev` as default branch.

### Initial remote setup (one-time)

```bash
# From repo root — keep legacy history readable
git remote rename origin legacy
git remote add origin https://github.com/kayzredman/lotrisC.git

# Verify
git remote -v
```

### First push to lotrisC

```bash
git checkout dev
# … commit all planning + agent doc changes …
git push -u origin dev
```

Set **default branch** to `dev` in GitHub repo Settings → Branches.

`main` is pushed **only after the first QA milestone** (see below) — not on first clone.

---

## Daily workflow

### 1. Always start from `dev`

```bash
git checkout dev
git pull origin dev
```

### 2. Work (agent or human)

- Small changes: commit directly on `dev` (or `feature/*` → PR to `dev`)
- Commit format: `[Phase X] type(scope): description` or `[Sprint X] …` for legacy NestJS fixes

Types: `feat` · `fix` · `refactor` · `test` · `chore` · `docs`

Examples:

```text
[Phase 0] feat(api): ASP.NET Core solution scaffold
[Phase 5] fix(onboarding): persist timezone on saveOrg
docs(qa): update DATABASE-STRATEGY decision log
```

### 3. QA gate before `dev` is considered done

From [`.github/agents/qa-agent.instructions.md`](../.github/agents/qa-agent.instructions.md):

- [ ] GitHub Actions **green** (when wired — required before merge/push policy hardens)
- [ ] Quality checklist (security, tenant isolation, tests on critical paths)
- [ ] OpenAPI contract updated if API changed
- [ ] `docs/SPRINTS.md` / phase tracker updated

**Push to `origin dev`:** after QA sign-off on the commit(s) for that slice.

```bash
git push origin dev
```

---

## Promoting `dev` → `main`

**When:** QA confirms milestone complete — tested locally or on staging/on-prem compose smoke.

**Not when:** Mid-phase WIP, failing CI, or docs-only planning commits (unless releasing docs snapshot intentionally).

### Promotion checklist

- [ ] All phase/milestone acceptance criteria met (see [REFACTOR.md](REFACTOR.md) parity checklist for Phase 7)
- [ ] `dotnet test` + `pnpm lint` + docker compose smoke **pass**
- [ ] No known P0/P1 open issues for this release
- [ ] `docs/SPRINTS.md` or phase log updated
- [ ] Version tag decided (`v0.24.0`, `v1.0.0-onprem`, etc.)

### Promotion commands

```bash
git checkout main
git pull origin main
git merge dev --no-ff -m "release: merge dev into main — Milestone Mx / Phase X"
git tag -a vX.Y.Z -m "Release vX.Y.Z — short description"
git push origin main
git push origin vX.Y.Z
git checkout dev
```

Use **`--no-ff`** merge to preserve release boundary in history.

**Never** force-push `main`.

---

## Push summary

| Action | Branch | Remote | When |
|--------|--------|--------|------|
| Day-to-day integration | `dev` | `origin` (lotrisC) | After QA sign-off on each slice |
| Production release | `main` | `origin` (lotrisC) | Milestone complete + tested |
| Tags | `vX.Y.Z` on `main` | `origin` (lotrisC) | Same time as main push |
| Historical reference | any | `legacy` (lotris) | Fetch only — no push |

---

## Relationship to old `lotris` repo

| Repo | Contents |
|------|----------|
| **lotris** | Sprint 1–23 NestJS monorepo; `dev` 125 commits ahead of stale `main` |
| **lotrisC** | Same codebase going forward + C# `src/` + on-prem packaging; clean `main` discipline |

Optional: add a note in legacy `lotris` README pointing to lotrisC — do not delete legacy repo.

---

## CI/CD (target state)

GitHub Actions on **lotrisC**:

| Trigger | Branch | Jobs |
|---------|--------|------|
| PR / push | `dev` | lint, test, build, compose smoke |
| Push | `main` | same + optional release artifact |

Deploy:

- **Staging:** auto from `dev` (optional)
- **On-prem release:** tagged `main` + Helm/compose bundle

---

## Agent responsibilities

| Agent | Git duty |
|-------|----------|
| **QA** | Owns merge to `dev`; owns `dev` → `main` at milestones; blocks push if CI red |
| **Backend / Frontend / Platform** | Commit to `feature/*` or `dev` per QA assignment; never push to `main` |
| **All** | Commit message format; no secrets in repo |

---

## Current workspace state (June 2026)

- Local branch: **`dev`**
- `origin` still points to **legacy `lotris`** until one-time remote rename (above)
- Uncommitted planning docs: `REFACTOR.md`, `DATABASE-STRATEGY.md`, `ONBOARDING-REFACTOR.md`, agent updates, etc.
- **Next git action:** commit planning slice on `dev` → re-point `origin` to lotrisC → `git push -u origin dev`

---

_Related: [REFACTOR.md](REFACTOR.md) · [ONBOARDING-REFACTOR.md](ONBOARDING-REFACTOR.md) · QA agent instructions_
