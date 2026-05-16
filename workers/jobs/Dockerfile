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

# Copy workspace root config first (layer-cached until these change)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy only the packages workers depends on
COPY packages/config/  ./packages/config/
COPY packages/db/      ./packages/db/
COPY packages/types/   ./packages/types/
COPY stubs/            ./stubs/
COPY workers/jobs/     ./workers/jobs/

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

# Copy workspace config + only the packages that have runtime deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json  ./packages/config/package.json
COPY packages/db/package.json      ./packages/db/package.json
COPY packages/types/package.json   ./packages/types/package.json
COPY workers/jobs/package.json     ./workers/jobs/package.json

# Install production deps only (esbuild excluded — only needed for build)
RUN pnpm install --frozen-lockfile --prod

# Copy the built bundle from builder stage
COPY --from=builder /app/workers/jobs/dist ./workers/jobs/dist

WORKDIR /app/workers/jobs

CMD ["node", "dist/index.js"]
