# syntax=docker/dockerfile:1

# Multi-stage build for the self-hosted Docker deployment (see ADR 0002).
# Two runnable targets:
#   - runtime:  slim Next.js standalone server (docker compose `app`)
#   - migrator: full dependency tree + Payload config, runs `payload migrate`
#               once at deploy time (docker compose `migrate`)
# `output: 'standalone'` in next.config.ts is only consumed by the runtime
# stage; Vercel deployments ignore it.

FROM node:22-alpine AS base

# Required by some native modules (e.g. sharp) on Alpine.
RUN apk add --no-cache libc6-compat

# pnpm is pinned by the "packageManager" field in package.json.
RUN corepack enable

ENV NEXT_TELEMETRY_DISABLED=1

# --- dependencies -----------------------------------------------------------

FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- build -------------------------------------------------------------------

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next build evaluates payload.config.ts to collect page data, and the config
# refuses to boot without a storage backend. Nothing is uploaded at build time;
# the real S3_* values are read from the environment at runtime.
ENV S3_ACCESS_KEY_ID=build-placeholder \
    S3_SECRET_ACCESS_KEY=build-placeholder \
    S3_BUCKET=media \
    S3_REGION=local \
    S3_ENDPOINT=http://localhost:9000

RUN pnpm build

# --- migrator (one-shot at deploy time) --------------------------------------

FROM base AS migrator
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json payload-types.ts payload.config.ts storage.ts ./
# Bake the pinned pnpm so the one-shot container needs no network at start.
RUN corepack install --global
COPY collections ./collections
COPY utils ./utils
COPY migrations ./migrations
# The copy set above must cover payload.config.ts's whole import graph except
# the admin UI (importMap component strings resolve only in the admin build).
# If payload.config.ts ever starts importing from features/, copy that here.

USER node

CMD ["pnpm", "exec", "payload", "migrate"]

# --- runtime ------------------------------------------------------------------

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
