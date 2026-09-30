# VPS with PostgreSQL and MinIO

**Status:** Accepted 2026-09-30; supersedes [0002](./0002-self-hosted-docker-deployment.md).

The target is one VPS running the same Compose-defined PostgreSQL 17 and MinIO
services used in local development. The app runs as a container behind Caddy on
the VPS; local development runs `next dev` on the host with only the data
services from that same file. This replaces the heavy local Supabase stack and
keeps the S3 adapter exercised before deployment. Vercel Blob support remains
for preview deployments during the transition.

The database and media share one VPS failure domain for now. The current data
is disposable demo data; **before the first real member is onboarded**, add
offsite backups of both PostgreSQL and MinIO and verify a restore. Local schema
push is explicitly opted in with `PAYLOAD_PUSH=true`; the VPS always uses
migrations before starting the app.
