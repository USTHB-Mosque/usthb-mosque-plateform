# Project guide for agents — USTHB Mosque Platform

Mosque community platform (library, activities, articles) built with Next.js 16
(App Router) + Payload CMS 3 on Postgres (Supabase), Arabic-first and RTL.

Generic Payload/Next knowledge lives upstream — do not paste it here:
- Payload docs: https://payloadcms.com/docs (LLM dump: https://payloadcms.com/llms-full.txt)
- Next.js docs: `node_modules/next/dist/docs/`

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next dev server (start Supabase first) |
| `pnpm supabase:start` / `pnpm supabase:stop` / `pnpm supabase:status` | Local Supabase stack (Docker) |
| `pnpm typecheck` | `tsc --noEmit` — run after every code change |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (RTL) once; `pnpm test:watch` while TDD-ing |
| `pnpm format:check` / `pnpm format` | Prettier check / write |
| `pnpm payload:importmap` | Regenerate admin import map after adding/modifying admin components |
| `pnpm payload:migrate-create <name>` | Generate a migration from the schema diff |
| `pnpm payload:migrate` | Apply migrations (run against a scratch DB to verify) |
| `pnpm seed` | Seed the local database (`utils/seed-all.ts`) |

Validate with all four gates before finishing: `format:check`, `lint`, `typecheck`, `test`.

## Project structure (the real tree)

```
app/                 routes only — the composition root; may import feature internals
features/<domain>/   components/ api/ server/ types.ts fixtures.ts index.ts
shared/              ui/ listing/ common/ layouts/ hooks/ lib/ providers/
collections/         Payload schema
utils/               constants shared by collections and features, seeds
proxy.ts             Next 16 proxy (auth cookie gate only, never the security boundary)
```

Current features: `admin auth library activities articles profile landing`.

Import rules (enforced in `eslint.config.mjs`):
- Features import each other **only through the barrel** (`@/features/<domain>`), never `@/features/<domain>/components/...`.
- `app/**` may reach into feature internals because it is the composition root.

## Non-negotiable rules

### Migrations (#95)
- **A change under `collections/` (or `globals/`) ships with a migration in the same pull request.** CI fails otherwise.
- Generate with `pnpm payload:migrate-create <name>`, review the SQL, and run `pnpm payload:migrate` against a scratch database to confirm it applies cleanly.
- Migrations are the authoritative schema source. `pnpm build` does **not** run migrations; they are applied at deploy/start time (see ADR 0002) and can be run manually with `pnpm payload:migrate`.

### Server actions ship with tests (#96)
- Every new or changed server action under `features/*/server/` gets a test file next to it (vitest).
- Run the single test file while working: `pnpm test <path>`; run the full suite once at the end.

### Payload security essentials
- The Local API **bypasses access control by default**. When passing `user`, always set `overrideAccess: false`. Administrative operations may omit `user` (intentional bypass).
- Always pass `req` to nested operations inside hooks — otherwise the nested op runs in a separate transaction.
- Use a `context: { skipHooks: true }` flag to prevent infinite hook loops.

## Environment reality

| Environment | Database | Storage | Config file |
| --- | --- | --- | --- |
| Development | Local Supabase (CLI) | Local Supabase S3 (`@payloadcms/storage-s3`) | `.env.local` |
| Non-development | Remote Supabase (`@payloadcms/db-postgres`) | Vercel Blob (`@payloadcms/storage-vercel-blob`) today | `.env` |

`storage.ts` implements this split — do not claim otherwise in docs. Self-hosting
via Docker is the deployment decision (ADR 0002); the Vercel Blob branch is on
the list to revisit when the host is chosen (#76).

## Gotchas worth an hour each

- `payload.auth()` **rejects a cookie when neither `Origin` nor `Sec-Fetch-Site` is present**. To authenticate `curl` against local endpoints or SSR pages, add `-H "Sec-Fetch-Site: same-origin"`.
- Rewrites in `next.config.ts` do **not** chain: a rewrite destination must be a real route.
- Local dev pushes the schema; migration drift is invisible until a fresh DB. Trust migrations, not push.

## Agent skills

- Issue tracker: GitHub Issues — `docs/agents/issue-tracker.md`
- Triage labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix — `docs/agents/triage-labels.md`
- Domain vocabulary: `CONTEXT.md`; decisions: `docs/adr/` — `docs/agents/domain.md`
- Agent tooling inventory and decisions: `docs/agents/tooling.md`
