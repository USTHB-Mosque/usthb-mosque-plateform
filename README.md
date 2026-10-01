# USTHB Mosque Platform

The digital platform for the USTHB mosque community: a library (borrowing,
waitlist, extensions, reviews), activities, articles, and a full admin panel.
Built Arabic-first, RTL throughout.

## Tech Stack

| Layer              | Technology                                              |
| ------------------ | ------------------------------------------------------- |
| **Framework**      | Next.js 16 (App Router)                                 |
| **CMS**            | Payload CMS 3                                           |
| **Database**       | PostgreSQL 17 (Docker Compose locally and on the VPS)   |
| **File Storage**   | RustFS (S3-compatible); Vercel Blob for Vercel previews |
| **UI**             | shadcn/ui patterns, Base UI / Radix                     |
| **Styling**        | Tailwind CSS 4                                          |
| **State**          | Zustand + React Query                                   |
| **Authentication** | Payload Auth (JWT), hand-rolled Google OAuth            |
| **Email**          | Nodemailer                                              |
| **Testing**        | Vitest + React Testing Library                          |

## Project Structure

```
app/                 Next.js routes only — the composition root
│   ├── (frontend)/  public-facing pages (library, activities, articles, auth)
│   └── (payload)/   Payload admin panel routes
features/<domain>/   features: components/ api/ server/ types.ts fixtures.ts index.ts
shared/              ui/ listing/ common/ layouts/ hooks/ lib/ providers/
collections/         Payload collection configs (schema)
utils/               constants shared by collections and features, seeds
proxy.ts             Next 16 proxy (auth cookie gate; never the security boundary)
migrations/          Postgres migrations (the authoritative schema source)
```

Current feature domains: `admin auth library activities articles profile landing`.

Import rules (enforced in `eslint.config.mjs`):

- Features import each other **only through the barrel** (`@/features/<domain>`).
- `app/**` may reach into feature internals because it is the composition root.

## Getting Started

### Prerequisites

- Node.js 22
- pnpm (version pinned in `package.json`)
- Docker with the Compose plugin

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `example.env` to `.env` and set `PAYLOAD_SECRET`. The template points
   host-run commands at Postgres (`127.0.0.1:5432`) and RustFS
   (`127.0.0.1:9000`). To use Payload's fast dev schema push, uncomment
   `PAYLOAD_PUSH=true` **only in your local `.env`**. Remove an old
   `.env.local`, or update **all** its DB and S3 settings (including credentials,
   bucket and region): Next loads it ahead of `.env` while Compose uses `.env`.

   ```bash
   cp example.env .env
   ```

3. Start Postgres and RustFS, create the media bucket, then apply migrations:

   ```bash
   pnpm dev:up
   pnpm storage:init
   pnpm payload:migrate
   ```

4. Optionally seed demo data, then start the host-run dev server:

   ```bash
   pnpm seed
   pnpm dev
   ```

   Frontend: http://localhost:3000 — Admin: http://localhost:3000/admin.
   After initial setup, `pnpm dev:full` starts the data services and dev server
   in one command. `pnpm dev:down` stops the containers without deleting their
   named volumes; **never** use `docker compose down -v` to stop them.
   If another checkout already runs e2e, set `E2E_PORT`,
   `E2E_GOOGLE_IDP_PORT`, `E2E_MAILPIT_SMTP_PORT`, `E2E_MAILPIT_API_PORT`, and
   `E2E_MAILPIT_CONTAINER_NAME` to unused values before `pnpm test:e2e`.

### Development workflow

- **Schema changes**: edit `collections/`, then generate and commit a migration
  with `pnpm payload:migrate-create <name>`. CI fails on schema changes without
  a migration. Verify migrations apply cleanly against a scratch database.
  Local `PAYLOAD_PUSH=true` is a convenience, not proof migrations will work on
  the VPS. Run `pnpm payload:migrate` on a fresh scratch database before shipping.
- **Types**: after schema changes run `pnpm payload generate:types`.
- **Admin components**: after adding or modifying admin components run
  `pnpm payload:importmap`.
- **Tests**: server actions under `features/*/server/` ship with vitest tests
  next to them (`pnpm test <path>` while working, full suite before finishing).
- **Before finishing**: run all four gates — `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test`. All four run in CI.

## Scripts

| Command                              | Description                                               |
| ------------------------------------ | --------------------------------------------------------- |
| `pnpm dev`                           | Next.js dev server on the host (run `pnpm dev:up` first)  |
| `pnpm dev:full`                      | Start Postgres and RustFS, then run `next dev`            |
| `pnpm dev:up` / `pnpm dev:down`      | Start/stop local Postgres and RustFS, preserving volumes  |
| `pnpm db:psql` / `pnpm db:logs`      | Connect to Postgres / follow the data-service logs        |
| `pnpm storage:init`                  | Create the media bucket if it does not exist              |
| `pnpm storage:console`               | Print the local RustFS console URL                        |
| `pnpm dev:preview`                   | Preview mode; uses whichever `DATABASE_URL` is configured |
| `pnpm build` / `pnpm start`          | Production build / server (Docker migrations at start)    |
| `pnpm lint` / `pnpm typecheck`       | ESLint / `tsc --noEmit`                                   |
| `pnpm test` / `pnpm test:watch`      | Vitest once / in watch mode                               |
| `pnpm test:e2e`                      | Canonical Playwright run (requires `pnpm dev:up`)         |
| `pnpm format:check` / `pnpm format`  | Prettier check / write                                    |
| `pnpm payload:importmap`             | Regenerate the admin import map                           |
| `pnpm payload:migrate-create <name>` | Generate a migration from the schema diff                 |
| `pnpm payload:migrate`               | Apply migrations                                          |
| `pnpm seed`                          | Seed the local database                                   |

## Environments

| Environment           | Database              | Media                           | Configuration             |
| --------------------- | --------------------- | ------------------------------- | ------------------------- |
| **Local dev / e2e**   | Compose PostgreSQL 17 | Compose RustFS                  | `.env` (and `.env.local`) |
| **VPS target**        | Compose PostgreSQL 17 | Compose RustFS                  | VPS `.env`                |
| **Vercel transition** | Neon PostgreSQL       | Vercel Blob (when token is set) | Vercel project settings   |

`storage.ts` implements this selection: on Vercel (any `VERCEL` env) Blob wins
whenever `BLOB_READ_WRITE_TOKEN` is present — even if stray S3 variables are
set — elsewhere S3 wins whenever the `S3_*` credentials are set. The VPS
deployment decision is recorded in [ADR 0003](docs/adr/0003-vps-postgres-rustfs.md).

## Deployment (Docker)

Point a domain at the VPS and allow inbound TCP 80/443 (and UDP 443 for HTTP/3).
Copy `example.env` to `.env` on the VPS. Set `SITE_DOMAIN` to that domain and
`NEXT_PUBLIC_SERVER_URL` to `https://` followed by it; set strong matching
values for `POSTGRES_PASSWORD` (URL-encoded in `DATABASE_URL`) and the `S3_*`
credentials, plus `PAYLOAD_SECRET`. Leave `PAYLOAD_PUSH` unset. The same compose
file builds the app, creates the media bucket, applies migrations and starts
Caddy in front of the app:

```bash
docker compose up --build --detach
docker compose ps
curl https://your-domain.example/api/health
```

- **App** — HTTPS through Caddy at `SITE_DOMAIN`, admin panel at `/admin`.
  Only Caddy listens publicly; Postgres and the RustFS API/console bind to
  loopback. Use an SSH tunnel if you need the RustFS console on a remote VPS.
- **Migrations** — run once in the `migrate` service before the app starts;
  the app never comes up if a migration fails. For a fresh install, create the
  first admin with `docker compose run --rm migrate pnpm bootstrap:admin` after
  setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.
- **Media** — stored in the persistent `media` bucket (Docker named volume
  `rustfs-data`), served through `/api/media/file/**` so collection access
  control applies. The app's `S3_ENDPOINT` is `http://rustfs:9000` inside
  compose; host-run dev and e2e use `http://127.0.0.1:9000`. The S3 adapter
  uses path-style addressing, so no `RUSTFS_SERVER_DOMAINS` is required.
  Similarly, `COMPOSE_DB_HOST` switches only the host and port of `DATABASE_URL`
  to `db:5432` inside containers, preserving encoded credentials.
- **Health** — `/api/health` returns 503 when the database is unreachable.

This VPS stack currently stores the database and media on one host. **Before
onboarding the first real member**, set up offsite backups of both PostgreSQL
RustFS and test restoring them; `pnpm seed` only recreates demo data. Configure
`EMAIL_*` and `GOOGLE_CLIENT_*` when enabling those features.

## Contributing

1. Branch from `dev`, keep changes focused.
2. Run the four gates (`format:check`, `lint`, `typecheck`, `test`) before every push.
3. Schema changes always ship with a migration in the same PR.
4. Open a pull request against `dev` with a clear description and linked issues.

See [AGENTS.md](AGENTS.md) for the working conventions agents and contributors
follow, [CONTEXT.md](CONTEXT.md) for domain vocabulary, and `docs/adr/` for
architectural decisions.

## License

This project is for educational purposes.
