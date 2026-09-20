# USTHB Mosque Platform

The digital platform for the USTHB mosque community: a library (borrowing,
waitlist, extensions, reviews), activities, articles, and a full admin panel.
Built Arabic-first, RTL throughout.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **CMS** | Payload CMS 3 |
| **Database** | PostgreSQL — local Supabase in dev, remote Supabase elsewhere |
| **File Storage** | Local Supabase S3 in dev, Vercel Blob elsewhere (`storage.ts`) |
| **UI** | shadcn/ui patterns, Base UI / Radix |
| **Styling** | Tailwind CSS 4 |
| **State** | Zustand + React Query |
| **Authentication** | Payload Auth (JWT), hand-rolled Google OAuth |
| **Email** | Nodemailer |
| **Testing** | Vitest + React Testing Library |

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

- Node.js 20+
- pnpm
- Docker (required by the Supabase CLI)

### Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Configure environment — copy `example.env` to `.env.local` (development)
   and to `.env` (preview/production) and fill in the values. Development needs:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
   S3_ENDPOINT=http://127.0.0.1:54321/storage/v1/s3
   S3_ACCESS_KEY_ID=<local-s3-access-key>
   S3_SECRET_ACCESS_KEY=<local-s3-secret-key>
   S3_BUCKET=media
   S3_REGION=local
   ```

3. Start the local Supabase stack:
   ```bash
   pnpm supabase:start
   ```

4. Seed the database (optional, realistic demo content):
   ```bash
   pnpm seed
   ```

5. Start the dev server:
   ```bash
   pnpm dev
   ```

   Frontend: http://localhost:3000 — Admin: http://localhost:3000/admin

### Development workflow

- **Schema changes**: edit `collections/`, then generate and commit a migration
  with `pnpm payload:migrate-create <name>`. CI fails on schema changes without
  a migration. Verify migrations apply cleanly against a scratch database.
- **Types**: after schema changes run `pnpm payload generate:types`.
- **Admin components**: after adding or modifying admin components run
  `pnpm payload:importmap`.
- **Tests**: server actions under `features/*/server/` ship with vitest tests
  next to them (`pnpm test <path>` while working, full suite before finishing).
- **Before finishing**: run all four gates — `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test`. All four run in CI.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server (start Supabase first) |
| `pnpm dev:full` | Start Supabase then the dev server |
| `pnpm dev:preview` | Dev server with `NODE_ENV=preview` (uses `.env`) |
| `pnpm dev:stop` | Stop local Supabase |
| `pnpm build` / `pnpm start` | Production build / server (migrations are applied at deploy time, not by build) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` / `pnpm test:watch` | Vitest once / in watch mode |
| `pnpm format:check` / `pnpm format` | Prettier check / write |
| `pnpm payload:importmap` | Regenerate the admin import map |
| `pnpm payload:migrate-create <name>` | Generate a migration from the schema diff |
| `pnpm payload:migrate` | Apply migrations |
| `pnpm seed` | Seed the local database |
| `pnpm supabase:start` / `:stop` / `:status` | Local Supabase stack |

## Environments

| Environment | Database | Storage | Config file |
|-------------|----------|---------|-------------|
| **Development** | Local Supabase (CLI) | Local Supabase S3 | `.env.local` |
| **Non-development** | Remote Supabase | Vercel Blob (today; revisit when the host is chosen) | `.env` |

`storage.ts` implements this split. The deployment decision is self-hosting via
Docker — see [ADR 0002](docs/adr/0002-self-hosted-docker-deployment.md).

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
