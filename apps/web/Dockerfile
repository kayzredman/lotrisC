# Lotris web — production image (Next.js standalone, monorepo root build context)
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter @lotris/web...

FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost
ARG NEXT_PUBLIC_AUTH_PROVIDERS=identity
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_AUTH_PROVIDERS=$NEXT_PUBLIC_AUTH_PROVIDERS

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY . .

RUN pnpm --filter @lotris/web build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
