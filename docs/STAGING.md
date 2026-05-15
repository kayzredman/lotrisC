# Lotris — Staging Deployment Guide

> **Stack:** Vercel (web) · Railway (API + Workers + MSSQL) · Neon (PostgreSQL) · Upstash (Redis)  
> **Purpose:** Staging / testing environment — zero or near-zero cost  
> **Branch to deploy:** `dev`

---

## Architecture Overview

```
Browser
  └─▶ Vercel  ──────────────────────────────── apps/web (Next.js 15)
                  NEXT_PUBLIC_API_URL ↓
              Railway Project "lotris-staging"
              ├── Service: api      (apps/api — NestJS/Fastify, port 4000)
              ├── Service: workers  (workers/jobs — BullMQ)
              └── Service: mssql    (Docker: mcr.microsoft.com/mssql/server:2022-latest)
                      │
                      ├── DATABASE_URL_POSTGRES ─▶ Neon    (analytics PostgreSQL)
                      └── REDIS_URL             ─▶ Upstash (cache + queues)
```

All services are connected purely through environment variables — no code changes per environment.

---

## Pre-flight Checklist

- [ ] GitHub repo access (for Railway + Vercel to pull code)
- [ ] Accounts created: Railway · Vercel · Neon · Upstash · Clerk (you already have one)
- [ ] `openssl` available locally (to generate JWT_SECRET)
- [ ] Railway CLI installed (optional but handy): `npm i -g @railway/cli`

---

## Step 1 — Neon (PostgreSQL analytics DB)

**Time: ~5 min**

1. Go to [neon.tech](https://neon.tech) → **Sign up / Log in**
2. Click **New Project** → Name: `lotris-staging` → Region: `us-east-2` (or closest to you)
3. Neon creates a default `neondb` database — rename it: **Database** tab → rename to `lotris_analytics`
4. Go to **Dashboard** → **Connection Details** → select **Pooled connection** toggle
5. Copy the connection string — it looks like:
   ```
   postgresql://lotris:<password>@ep-xxx-xxx.us-east-2.aws.neon.tech/lotris_analytics?sslmode=require
   ```
6. Save this as your **`DATABASE_URL_POSTGRES`** value

> Neon free tier: 0.5 GB storage, 1 compute unit. Fine for staging.

---

## Step 2 — Upstash (Redis)

**Time: ~3 min**

1. Go to [upstash.com](https://upstash.com) → **Console** → **Redis** → **Create Database**
2. Name: `lotris-staging` · Region: `us-east-1` · Enable **TLS** (required)
3. Click **Create**
4. On the database detail page, find **REDIS_URL** — it starts with `rediss://` (double-s = TLS)
5. Copy it as your **`REDIS_URL`** value

> Upstash free tier: 10,000 commands/day. Fine for staging and light testing.

---

## Step 3 — Railway Project Setup

**Time: ~25 min total for all 3 Railway services**

### 3a — Create the Project

1. Go to [railway.app](https://railway.app) → **New Project** → **Empty Project**
2. Name the project: `lotris-staging`

---

### 3b — MSSQL Service

1. In the project, click **+ New** → **Docker Image**
2. Image: `mcr.microsoft.com/mssql/server:2022-latest`
3. Rename the service to **`mssql`**
4. Go to the service's **Variables** tab → add:

   | Variable | Value |
   |----------|-------|
   | `ACCEPT_EULA` | `Y` |
   | `MSSQL_SA_PASSWORD` | A strong password (e.g. `Lotris@Staging2024!`) — **save this** |
   | `MSSQL_PID` | `Developer` |

5. Click **Deploy** — wait for it to show **Active** (takes ~60 seconds)
6. Go to **Settings** → **Networking** → note the **Private Domain** (internal hostname, e.g. `mssql.railway.internal`)
7. Your MSSQL connection string (for use inside Railway only):
   ```
   sqlserver://sa:<your-password>@mssql.railway.internal:1433;database=lotris;trustServerCertificate=true
   ```

> **Note:** The MSSQL `lotris` database is created automatically by Drizzle migrations in Step 4.

---

### 3c — API Service

1. Click **+ New** → **GitHub Repo** → select `kayzredman/lotris` → branch: `dev`
2. Rename service to **`api`**
3. Go to **Settings** → **Build & Deploy**:
   - **Root Directory**: *(leave empty — use repo root)*
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm --filter @lotris/api build`
   - **Start Command**: `pnpm --filter @lotris/api start`
4. Go to **Variables** tab → add all variables from `.env.staging.example`:
   - `NODE_ENV` = `production`
   - `DATABASE_URL_MSSQL` = the sqlserver:// string from Step 3b
   - `DATABASE_URL_POSTGRES` = from Step 1
   - `REDIS_URL` = from Step 2
   - `CLERK_SECRET_KEY` = from [Clerk dashboard](https://dashboard.clerk.com) → API Keys
   - `CLERK_WEBHOOK_SECRET` = from Clerk → Webhooks (see Step 5 below)
   - `JWT_SECRET` = run `openssl rand -base64 32` locally → paste the output
   - `API_PORT` = `4000`
   - `APP_BASE_URL` = *(set this after Vercel is deployed — come back to it)*
   - Email vars: optional for staging (leave blank to disable email)
5. Click **Deploy**

---

### 3d — Workers Service

1. Click **+ New** → **GitHub Repo** → same repo → branch: `dev`
2. Rename service to **`workers`**
3. **Settings** → **Build & Deploy**:
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm --filter @lotris/workers build`
   - **Start Command**: `pnpm --filter @lotris/workers start`
4. **Variables** tab → add the **same** DB + Redis + Clerk + JWT vars as the API service  
   *(Workers do not need `API_PORT` or `APP_BASE_URL`)*
5. Click **Deploy**

---

## Step 4 — Run Database Migrations

**After** the MSSQL Railway service is healthy:

### Option A — Railway Shell (no CLI needed)
1. In Railway dashboard → `api` service → **Shell** tab
2. Run:
   ```bash
   DATABASE_URL=sqlserver://sa:<password>@mssql.railway.internal:1433;database=lotris;trustServerCertificate=true \
     pnpm --filter @lotris/db db:migrate
   ```

### Option B — Railway CLI from local machine
```bash
# Install CLI once
npm i -g @railway/cli

# Log in and link to project
railway login
railway link  # select "lotris-staging" project and "api" service

# Run migration via Railway's environment
railway run -- sh -c 'DATABASE_URL="$DATABASE_URL_MSSQL" pnpm --filter @lotris/db db:migrate'
```

> PostgreSQL (Neon) has no migrations to run — the analytics schema is managed by the ETL worker which creates tables on first run.

---

## Step 5 — Clerk Webhook (for user provisioning)

Lotris uses Clerk webhooks to create users in MSSQL on first sign-in.

1. In [Clerk dashboard](https://dashboard.clerk.com) → **Webhooks** → **Add Endpoint**
2. URL: `https://<your-railway-api-url>/api/v1/webhooks/clerk`  
   *(Railway API public URL: `api` service → Settings → Networking → Public Domain)*
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
4. Copy the **Signing Secret** (`whsec_...`) → set as `CLERK_WEBHOOK_SECRET` in Railway API vars
5. Redeploy the API service to pick up the updated var

---

## Step 6 — Vercel (Next.js Web)

**Time: ~10 min**

1. Go to [vercel.com](https://vercel.com) → **New Project** → **Import Git Repository** → select `kayzredman/lotris`
2. **Framework Preset**: Next.js *(auto-detected)*
3. **Root Directory**: leave as `/` *(vercel.json at repo root handles the rest)*
4. **Environment Variables** — add these three:

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://<your-api-service>.up.railway.app` *(from Railway API service Public Domain)* |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` *(Clerk dashboard → API Keys)* |
   | `CLERK_SECRET_KEY` | `sk_test_...` *(Clerk dashboard → API Keys)* |

5. Click **Deploy** — first build takes ~3 min
6. Copy the Vercel deployment URL (e.g. `https://lotris-abc123.vercel.app`)
7. Go back to Railway → **API service** → **Variables** → update `APP_BASE_URL` to the Vercel URL → Redeploy

---

## Step 7 — Add Vercel URL to Clerk

1. Clerk dashboard → **Domains** → **Add Domain** → enter your Vercel URL
2. Clerk dashboard → **Redirects** → set **Sign-in URL** to `/login` and **After sign-in** to `/dashboard`

---

## Step 8 — Smoke Test

Run through this checklist after everything is deployed:

- [ ] `https://<vercel-url>/` — landing page loads
- [ ] `https://<vercel-url>/login` — Clerk sign-in form appears
- [ ] `https://<railway-api-url>/health` — returns `{"status":"UP","service":"api",...}`
- [ ] Sign in with a test user → redirected to `/dashboard`
- [ ] Dashboard loads with no API errors in browser console
- [ ] `/system-health` → all 6 service cards show UP (may take 30s after deploy)
- [ ] `/monitor` — public monitor wall loads without signing in
- [ ] Create a test ticket → verify it appears in `/tickets`

---

## Auto-Deploy Setup (optional)

Both Railway services and Vercel can auto-deploy when `dev` branch is pushed:

- **Vercel**: enabled by default — every push to `dev` triggers a new deployment
- **Railway API + Workers**: Settings → **Deploy on Push** → enable, branch: `dev`

---

## Environment Variable Distribution Summary

| Variable | Vercel | Railway API | Railway Workers |
|----------|--------|-------------|-----------------|
| `NEXT_PUBLIC_API_URL` | ✅ | — | — |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | — | — |
| `CLERK_SECRET_KEY` | ✅ | ✅ | — |
| `CLERK_WEBHOOK_SECRET` | — | ✅ | — |
| `DATABASE_URL_MSSQL` | — | ✅ | ✅ |
| `DATABASE_URL_POSTGRES` | — | ✅ | ✅ |
| `REDIS_URL` | — | ✅ | ✅ |
| `JWT_SECRET` | — | ✅ | — |
| `API_PORT` | — | ✅ | — |
| `APP_BASE_URL` | — | ✅ | — |
| Email vars | — | ✅ | ✅ |

---

## Teardown (when done testing)

1. Railway → project settings → **Delete Project** (removes all Railway services + MSSQL data)
2. Neon → project → **Delete Project**
3. Upstash → database → **Delete Database**
4. Vercel → project → **Settings** → **Delete Project**

> Clerk dev instance has no cost — leave it running.
