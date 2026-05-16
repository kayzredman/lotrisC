# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Lotris Workers — Railway Dockerfile
#
# Build context: REPO ROOT (not workers/jobs/)
# In Railway: Settings → Source → Dockerfile Path = workers/jobs/Dockerfile
#             (Docker build context stays at repo root by default)
#
# Stage 1 (builder): installs ALL deps (including devDeps for esbuild),
#                    bundles workers/jobs/src → dist/index.js
# Stage 2 (runner):  production image with only runtime deps + the bundle
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy full repo (node_modules, dist, .git excluded via .dockerignore)
COPY . .

# Install ALL dependencies (including devDependencies for esbuild)
RUN pnpm install --frozen-lockfile

# Bundle workers → dist/index.js
RUN pnpm --filter @lotris/workers build

# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS runner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
RUN corepack enable

WORKDIR /app

# Copy all workspace package.json files for pnpm workspace resolution
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json  ./packages/config/package.json
COPY packages/db/package.json      ./packages/db/package.json
COPY packages/types/package.json   ./packages/types/package.json
COPY packages/ui/package.json      ./packages/ui/package.json
COPY apps/api/package.json         ./apps/api/package.json
COPY apps/web/package.json         ./apps/web/package.json
COPY workers/jobs/package.json     ./workers/jobs/package.json

# Install production deps only (esbuild excluded — only needed for build)
# mssql is kept external by the bundle, so it must be installed here
RUN pnpm install --frozen-lockfile --prod

# Copy the built bundle from builder stage
COPY --from=builder /app/workers/jobs/dist ./workers/jobs/dist

WORKDIR /app/workers/jobs

CMD ["node", "dist/index.js"]
