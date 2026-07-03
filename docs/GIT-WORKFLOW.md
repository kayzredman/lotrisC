# Lotris — Git Workflow

> **Status: ACTIVE** — June 2026  
> **Canonical remote:** [github.com/kayzredman/lotrisC](https://github.com/kayzredman/lotrisC.git)  
> **Legacy remote:** [github.com/kayzredman/lotris](https://github.com/kayzredman/lotris.git) (Sprint 1–23 NestJS history — read-only reference)

---

## Branch model

```
local dev     ← DEFAULT. All day-to-day work happens here (Backend + Frontend agents).
  ↓ QA certifies job/phase complete
origin dev    ← push local dev
origin main   ← merge local dev → local main, then push local main
```

| Branch | Purpose | Who updates | Direct commits? |
|--------|---------|-------------|-------------------|
| **`dev`** (local) | Integration — all agent work lands here first | Backend / Frontend agents; QA merges `feature/*` if used | Yes (on local `dev` only) |
| **`dev`** (remote) | Canonical integration on GitHub | QA Agent after certification | Push from local `dev` |
| **`main`** (local + remote) | Production mirror — kept in sync with certified `dev` | QA Agent after certification | **Never** direct commits — merge from `dev` only |
| **`feature/phase-X-*`** | Large isolated work (optional) | QA → local `dev` | Developers/agents |

**Rule:** Work on **local `dev`**. Nothing is pushed until the **QA Agent certifies** the job or phase. After certification, push **both** `dev` and `main` to `origin` so the remote stays current.

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

### 1. Always start from local `dev`

```bash
git checkout dev
git pull origin dev
```

### 2. Work (Backend Agent, Frontend Agent, or human)

- All day-to-day commits go on **local `dev`** (or `feature/*` → merge to local `dev`)
- Commit format: `[Phase X] type(scope): description` or `[Sprint X] …` for legacy NestJS fixes

Types: `feat` · `fix` · `refactor` · `test` · `chore` · `docs`

Examples:

```text
[Phase 0] feat(api): ASP.NET Core solution scaffold
[Phase 5] fix(onboarding): persist timezone on saveOrg
docs(qa): update DATABASE-STRATEGY decision log
```

### 3. QA Agent certifies before anything moves forward

The **QA Agent** reviews Backend and Frontend output, runs the quality checklist, and **certifies the job or phase complete** before the team starts the next job or phase.

From [`.github/agents/qa-agent.instructions.md`](../.github/agents/qa-agent.instructions.md):

- [ ] GitHub Actions **green** (when wired)
- [ ] Quality checklist (security, tenant isolation, tests on critical paths)
- [ ] OpenAPI contract updated if API changed
- [ ] `docs/SPRINTS.md` / phase tracker updated

**Do not push** until QA certifies. **Do not start the next job or phase** until QA certifies the current one.

### 4. After QA certification — push both branches

Remote `origin` is maintained by pushing **local `dev`** and **local `main`**:

```bash
# 1. Push certified work on dev
git push origin dev

# 2. Fast-forward or merge dev into main, then push main
git checkout main
git pull origin main
git merge dev --no-ff -m "release: QA certified — <short description>"
git push origin main
git checkout dev
```

Use **`--no-ff`** on `main` merges to preserve certification boundaries in history.

**Never** force-push `main`.

### 5. Version tags (milestones)

Tag on `main` when a milestone or release warrants it (e.g. Phase 7 cutover, on-prem release):

```bash
git checkout main
git tag -a vX.Y.Z -m "Release vX.Y.Z — short description"
git push origin vX.Y.Z
git checkout dev
```

---

## Push summary

| Action | Branch | Remote | When |
|--------|--------|--------|------|
| Day-to-day work | local `dev` | — | Backend / Frontend agents commit here |
| QA certification | — | — | QA Agent signs off; blocks next job/phase until green |
| Sync integration | `dev` | `origin` (lotrisC) | After QA certification |
| Sync production mirror | `main` | `origin` (lotrisC) | Merge local `dev` → local `main`, push after QA certification |
| Release tags | `vX.Y.Z` on `main` | `origin` (lotrisC) | Milestones / named releases (optional per slice) |
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

Three agents coordinate all work:

| Agent | Git duty |
|-------|----------|
| **QA Agent** | Assigns jobs; reviews and **certifies** work before next job/phase; pushes `dev` and `main` to `origin` after certification; blocks push if CI red |
| **Backend Agent** | Commits to local `dev` (or `feature/*` → `dev`) per QA assignment; never pushes or commits to `main` |
| **Frontend Agent** | Commits to local `dev` (or `feature/*` → `dev`) per QA assignment; never pushes or commits to `main` |
| **All** | Commit message format; no secrets in repo |

---

## Current workspace state (June 2026)

- Local branch: **`dev`**
- `origin` still points to **legacy `lotris`** until one-time remote rename (above)
- Uncommitted planning docs: `REFACTOR.md`, `DATABASE-STRATEGY.md`, `ONBOARDING-REFACTOR.md`, agent updates, etc.
- **Next git action:** commit planning slice on `dev` → re-point `origin` to lotrisC → `git push -u origin dev`

---

_Related: [REFACTOR.md](REFACTOR.md) · [ONBOARDING-REFACTOR.md](ONBOARDING-REFACTOR.md) · QA agent instructions_
