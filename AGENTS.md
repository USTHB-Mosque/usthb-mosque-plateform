# Project guide for agents — USTHB Mosque Platform

Mosque community platform (library, activities, articles) built with Next.js 16
(App Router) + Payload CMS 3 on PostgreSQL, Arabic-first and RTL.

Generic Payload/Next knowledge lives upstream — do not paste it here:

- Payload docs: https://payloadcms.com/docs (LLM dump: https://payloadcms.com/llms-full.txt)
- Next.js docs: `node_modules/next/dist/docs/`

## Commands

| Command                                                 | What it does                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm dev`                                              | Host-run Next dev server (run `pnpm dev:up` first)                       |
| `pnpm dev:up` / `pnpm dev:down` / `pnpm dev:full`       | Start/stop compose DB + RustFS, or start both and Next dev               |
| `pnpm typecheck`                                        | `tsc --noEmit` — run after every code change                             |
| `pnpm lint`                                             | ESLint                                                                   |
| `pnpm test`                                             | Vitest — all projects once; `pnpm test:watch` while TDD-ing              |
| `pnpm test:unit` / `pnpm test:int`                      | One Vitest project only                                                  |
| `pnpm test:coverage`                                    | Vitest with coverage thresholds enforced                                 |
| `pnpm test:e2e`                                         | Playwright e2e — canonical: migrate + build + start against `mosque_e2e` |
| `pnpm test:e2e:dev` / `test:e2e:headed` / `test:e2e:ui` | e2e against `next dev` on the e2e DB (authoring) / headed / UI mode      |
| `pnpm format:check` / `pnpm format`                     | Prettier check / write                                                   |
| `pnpm payload:importmap`                                | Regenerate admin import map after adding/modifying admin components      |
| `pnpm payload:migrate-create <name>`                    | Generate a migration from the schema diff                                |
| `pnpm payload:migrate`                                  | Apply migrations (run against a scratch DB to verify)                    |
| `pnpm seed`                                             | Seed the local database (`utils/seed-all.ts`)                            |

Validate with all four gates before finishing: `format:check`, `lint`, `typecheck`, `test`.

## Project structure (the real tree)

```
app/                 routes only — the composition root; may import feature internals
features/<domain>/   components/ api/ server/ types.ts fixtures.ts index.ts
shared/              ui/ listing/ common/ layouts/ hooks/ lib/ providers/
collections/         Payload schema
utils/               constants shared by collections and features, seeds
e2e/                 Playwright e2e specs (canonical run: migrate + build + start, never dev data)
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

### Tests (#96)

- **New server actions (`features/*/server/**`) and collection changes (`collections/**`) ship with tests in the same PR.** Integration tests boot a real Payload against a scratch Postgres via `getPayload` — do not mock Payload; access control and hooks must actually run. (Unit-style mocked tests like `features/admin/server/*.test.ts` are the exception for pure branching logic.)
- Runner: Vitest, three projects — `*.test.{ts,tsx}` (RTL/jsdom for components and mocked server actions), `*.unit.test.ts` (pure functions, node), `*.int.test.ts` (real Payload + database). Commands: `pnpm test`, `pnpm test:unit`, `pnpm test:int`, `pnpm test:coverage`.
- Integration tests live under `test/`, share `test/setup-integration.ts` (Next.js `headers`/`cookies` stubs, `@/payload.config` redirected to `test/payload-test.config.ts`), and truncate all tables between tests. They need a running Postgres: locally `pnpm dev:up` (a `mosque_test` scratch database is created automatically), in CI a `postgres:17` service container. The S3 integration test also needs RustFS (`pnpm storage:init` creates its bucket).
- Coverage thresholds (100% lines/branches/functions/statements) are enforced on `shared/lib/**`, `features/*/server/**`, `collections/**` — CI fails when they are missed.
- Never pass `user` to the Local API without `overrideAccess: false` — including inside tests.

### Payload security essentials

- The Local API **bypasses access control by default**. When passing `user`, always set `overrideAccess: false`. Administrative operations may omit `user` (intentional bypass).
- Always pass `req` to nested operations inside hooks — otherwise the nested op runs in a separate transaction.
- Use a `context: { skipHooks: true }` flag to prevent infinite hook loops.

### E2E (Playwright)

- **Journey specs reuse sessions instead of logging in.** `e2e/auth.setup.ts` authenticates the member and the admin once per run; specs load `e2e/lib/auth-state.ts` storage states and open a second context (`browser.newContext({ storageState: adminStorageState })`) when a journey crosses roles. Auth-flow specs exercise the login/OAuth/reset UI itself.
- **Seed contract:** every run truncates and rebuilds `mosque_e2e` from scratch (`utils/seed-e2e.ts`), so ids restart at 1 — look up fixtures by email/title, never by id, and keep new fixtures deterministic in `utils/seed/e2e-fixtures.ts`.
- Canonical mode (default) drops + migrates before the app's build, then starts on :3100 and seeds after the server is ready — it is the gate; `E2E_DEV=1` reuses `next dev` for authoring only (it must never see a database whose schema was migrated from a different model state, or the push blocks on an interactive prompt).
- E2E routes SMTP to its dedicated local Mailpit container (`e2e/lib/env.ts` pins `EMAIL_HOST=127.0.0.1`, defaults `EMAIL_PORT` to 54325, and clears credentials). Password-reset specs read Mailpit's API (default :54326). Override `E2E_MAILPIT_*` and `E2E_PORT` when running alongside another worktree; all e2e mail stays local, including during migrations and seeding.
- Administrative Local API calls inside specs/seeds (arrangement writes with no `user`) are an intentional bypass; anything asserting access behavior must go through the UI or `overrideAccess: false` with a `user`.
- Visual baselines (`e2e/visual.spec.ts-snapshots/`) are generated only under the canonical run (`--update-snapshots=all`); date/time regions are masked because the seed's dates are relative to seed time.
- The axe scan (`e2e/a11y.spec.ts`) fails only on serious and critical violations; the rest are logged, so a green run does not mean a clean report.

## Environment reality

| Environment       | Database                         | Storage                                   | Config source           |
| ----------------- | -------------------------------- | ----------------------------------------- | ----------------------- |
| Development / e2e | Compose PostgreSQL 17            | Compose RustFS (`@payloadcms/storage-s3`) | `.env` / `.env.local`   |
| VPS target        | Compose PostgreSQL 17            | Compose RustFS (`@payloadcms/storage-s3`) | VPS `.env`              |
| Vercel transition | Neon (`@payloadcms/db-postgres`) | Vercel Blob when a token is configured    | Vercel project settings |

`storage.ts` selects by environment variables: Vercel deployments (any
`VERCEL` env) use Vercel Blob whenever `BLOB_READ_WRITE_TOKEN` exists — even
if stray S3 variables are set — while every other environment uses S3 when
`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` are set, falling back to Blob on a
non-Vercel host with only a token. Dev runs `next dev` on the host with the
compose `db` and `rustfs` services. Compose app/migrator force
`NODE_ENV=production`, `PAYLOAD_PUSH=false`, in-network DB/S3 hosts; local
schema push requires `PAYLOAD_PUSH=true` explicitly. See ADR 0003.

## Gotchas worth an hour each

- `payload.auth()` **rejects a cookie when neither `Origin` nor `Sec-Fetch-Site` is present**. To authenticate `curl` against local endpoints or SSR pages, add `-H "Sec-Fetch-Site: same-origin"`.
- Rewrites in `next.config.ts` do **not** chain: a rewrite destination must be a real route.
- Local `PAYLOAD_PUSH=true` pushes the schema; migration drift is invisible until a fresh DB. Trust migrations, not push.
- Docker builds run before the DB starts. Pages/layouts that read Payload while rendering must be request-dynamic so `next build` does not query Postgres.

## Auth surface

`shared/lib/auth.ts` is the single auth helper module: `getAuthenticatedUser`,
`getPayloadWithUser`, `requireUser`, `setPayloadTokenCookie`, and
`createSessionForUser` (issues the token cookie after registration/OAuth).
Import auth helpers from there, never re-derive sessions ad hoc.

Role checks are not in that module: `isAdmin`, `isLibrarian` and `isStaff` live
in `utils/access-helpers.ts`, the one implementation every collection, global
and server action shares. Import them from there — there is no second copy.

## Agent skills

- Issue tracker: GitHub Issues — `docs/agents/issue-tracker.md`
- Triage labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix — `docs/agents/triage-labels.md`
- Domain vocabulary: `CONTEXT.md`; decisions: `docs/adr/` — `docs/agents/domain.md`
- Agent tooling inventory and decisions: `docs/agents/tooling.md`
- Theming (light/dark contract, token rules, scope): `docs/theming.md`
