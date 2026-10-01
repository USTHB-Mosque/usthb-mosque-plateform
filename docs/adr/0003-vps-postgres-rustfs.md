# VPS with PostgreSQL and RustFS

**Status:** Accepted 2026-09-30; supersedes [0002](./0002-self-hosted-docker-deployment.md).

The target is one VPS running the same Compose-defined PostgreSQL 17 and
RustFS services used in local development. The app runs as a container behind
Caddy on the VPS; local development runs `next dev` on the host with only the
data services from that same file. This replaces the heavy local Supabase stack
and keeps the S3 adapter exercised before deployment. Vercel Blob support
remains for preview deployments during the transition.

RustFS rather than MinIO: it speaks the same S3 API and is published on Docker
Hub, while MinIO is distributed only from quay.io, which refused anonymous image
pulls — from CI and from this network — and whose Docker Hub repositories no
longer exist. RustFS ships no `mc` client, so the media bucket is created by
`pnpm storage:init` using the same AWS SDK the app uses; the deploy path runs it
before migrations in the one-shot `migrate` service.

The database and media share one VPS failure domain for now. The current data
is disposable demo data; **before the first real member is onboarded**, add
offsite backups of both PostgreSQL and the object store and verify a restore.
Local schema push is explicitly opted in with `PAYLOAD_PUSH=true`; the VPS
always uses migrations before starting the app.
