# TEAMLIST.xlsx (local only — not in git)

The digital setup seed script reads team/user data from an Excel file:

```bash
pnpm seed:digital
# → scripts/seed-lotris-digital-setup.mjs
```

## File location

Place your spreadsheet at:

```
docs/TEAMLIST.xlsx
```

Or set a custom path:

```bash
LOTRIS_TEAM_LIST_XLSX=/path/to/teamlist.xlsx pnpm seed:digital
```

## Expected columns

Row 1 headers (case-insensitive):

- **Email**
- **Full Name**
- **Designation** (e.g. Super Admin, Team Lead, Engineer)
- **Unit** (team name)

## Why not in the repo?

The spreadsheet may contain real org names and emails. It is **intentionally gitignored** — obtain a copy from your project admin or export from HR, then place it locally for dev seeding only.
