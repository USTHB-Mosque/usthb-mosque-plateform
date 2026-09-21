# Self-hosted Docker deployment

**Status:** Supersedes [0001-vercel-for-deployment.md](./0001-vercel-for-deployment.md), recorded 2026-09-05. See #76 for the deployment setup work.

## Decision

Deploy the platform self-hosted via Docker. The host has not been chosen yet (#76 tracks that).

## Context

ADR 0001 argued for Vercel, citing `@payloadcms/db-vercel-postgres` as a reason — which was never even a dependency of this project. The actual deployment reality moved on: the 2026-09-05 decision is to self-host with Docker (the `Dockerfile` and `docker-compose.yml` already exist), with the database and S3-compatible storage on Supabase.

## Consequences

- No Vercel-specific build pipeline. CI stays GitHub Actions (lint, typecheck, migration guard).
- Migrations run at deploy/start time, not at build (`pnpm build` does not migrate — see AGENTS.md).
- Any Vercel-only affordances (e.g. `@payloadcms/storage-vercel-blob` used in `storage.ts` outside development) remain on the list to revisit when the host is chosen (#76).
