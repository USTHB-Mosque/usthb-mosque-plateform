# CI/CD Pipeline Setup

## Problem Statement

The project has no CI/CD pipeline. There are no GitHub Actions workflows, no Vercel configuration, and no automated quality checks. Changes go to production without linting, type checking, or preview verification. Secrets are committed in `.env` files. The deployment process is entirely manual.

## Solution

Set up a Vercel-native deployment pipeline with GitHub Actions for CI checks. Every PR gets linted and type-checked. Every push to `dev` gets a Vercel preview URL. Every merge to `main` auto-deploys to production. All runtime secrets live in Vercel only — CI has zero secrets.

## User Stories

1. As a developer, I want `pnpm lint` to run on every PR, so that code style issues are caught before merge
2. As a developer, I want `pnpm typecheck` to run on every PR, so that type errors are caught before merge
3. As a developer, I want CI to complete in under 2 minutes, so that PR feedback is fast
4. As a developer, I want every push to `dev` to produce a Vercel preview URL, so that I can verify changes in a live environment before promoting to production
5. As a developer, I want every PR to `main` to produce a Vercel preview URL, so that production merges are verified before they happen
6. As a developer, I want merge to `main` to auto-deploy to production, so that shipping is automatic and frictionless
7. As a developer, I want CI to use `pnpm install --frozen-lockfile`, so that dependency versions are deterministic
8. As a developer, I want CI to use the pinned `pnpm@10.33.0` from `packageManager`, so that all developers and CI use the same package manager version
9. As a developer, I want zero secrets in GitHub Actions, so that there is no secret duplication or rotation burden
10. As a developer, I want all runtime secrets (PAYLOAD_SECRET, DATABASE_URL, S3 keys, email credentials) configured in Vercel only, so that secret management is centralized
11. As a developer, I want S3 storage env vars pre-configured in Vercel, so that storage can be enabled without another deployment config change
12. As a developer, I want the `build` script (`payload migrate && next build`) to run automatically on Vercel deploy, so that migrations are applied and the app is built in one step
13. As a developer, I want a `vercel.json` if needed for build configuration, so that Vercel knows how to build the Next.js + Payload app
14. As a developer, I want the CI workflow to be triggered on PRs to both `dev` and `main`, so that both branches are protected
15. As a developer, I want the CI workflow to NOT trigger on pushes to branches (only on PRs), so that we avoid redundant runs on direct pushes
16. As a developer, I want the `.gitignore` to continue ignoring `.vercel`, so that local Vercel project links are not committed
17. As a developer, I want to know whether `output: 'standalone'` needs to be set in `next.config.ts`, so that the Dockerfile and Vercel build work correctly
18. As a developer, I want a clear separation between CI (checks) and CD (deploy), so that each concern is independently configurable

## Implementation Decisions

### GitHub Actions Workflow

Create `.github/workflows/ci.yml` with a single job that runs on PRs to `dev` and `main`:

- **Triggers:** `pull_request` targeting `dev` and `main` branches
- **Runner:** `ubuntu-latest`
- **Steps:** checkout, setup pnpm (via `pnpm/action-setup`), setup node (with corepack enable for pnpm version pinning), `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`
- **No secrets required** — lint and typecheck don't need database, API, or storage access
- **No build step in CI** — build runs only on Vercel deploy

### Vercel Configuration

Vercel auto-detects Next.js projects. The default build command on Vercel will run `pnpm build` which executes `payload migrate && next build`. No `vercel.json` is needed unless custom build settings are required.

If Vercel doesn't auto-detect the pnpm version, a `vercel.json` with `installCommand: "corepack enable && pnpm install --frozen-lockfile"` may be needed.

### Environment Variables in Vercel

Configure these in Vercel's dashboard under Settings → Environment Variables, for both Preview and Production environments:

| Variable | Environment |
|----------|-------------|
| `PAYLOAD_SECRET` | Preview + Production |
| `DATABASE_URL` | Preview + Production |
| `NEXT_PUBLIC_SERVER_URL` | Preview + Production |
| `NEXT_PUBLIC_API_URL` | Preview + Production |
| `S3_ENDPOINT` | Preview + Production |
| `S3_ACCESS_KEY_ID` | Preview + Production |
| `S3_SECRET_ACCESS_KEY` | Preview + Production |
| `S3_BUCKET` | Preview + Production |
| `S3_REGION` | Preview + Production |
| `EMAIL_USER` | Preview + Production |
| `EMAIL_PASSWORD` | Preview + Production |
| `NODE_ENV` | Production = `production`, Preview = `preview` |

### Branch Workflow

- `dev` branch: preview environment. Every push gets a Vercel preview URL.
- `main` branch: production. Every merge auto-deploys to production.
- PRs to either branch get a Vercel preview deployment + GitHub Actions CI checks.

### Next.js Config

The `next.config.ts` does NOT set `output: 'standalone'`. This is fine — Vercel handles its own build pipeline. Docker builds would need it, but Docker is out of scope for now.

### Build Script

The existing `build` script (`payload migrate && next build`) is correct for Vercel. Migrations run at build time, not at runtime. This means the Vercel build environment needs `DATABASE_URL` available during build — Vercel provides this automatically if the env var is configured.

## Testing Decisions

- **What to test:** The CI workflow itself can be validated by opening a PR and confirming the workflow runs and passes.
- **What NOT to test:** No application tests exist yet. Playwright is installed but unconfigured. Adding tests is out of scope for this spec.
- **Validation:** After implementation, verify by: (1) pushing a PR to `dev` and confirming CI runs, (2) checking Vercel preview deployment URL is generated, (3) merging to `main` and confirming production deploy.

## Out of Scope

- Writing application tests (Playwright is installed but unconfigured — separate effort)
- Setting up Vercel project (manual step: connect GitHub repo in Vercel dashboard)
- Configuring Vercel environment variables (manual step: enter secrets in Vercel dashboard)
- Removing committed secrets from git history (separate security effort)
- Setting up branch protection rules on GitHub (manual step)
- Docker-based CI/CD (the Dockerfile exists as an escape hatch but is not part of this pipeline)
- Preview environment variable differentiation (both Preview and Production get the same secrets for now)
- `output: 'standalone'` in next.config.ts (not needed for Vercel; revisit if Docker is added later)
- `vercel.json` configuration (wait to see if Vercel auto-detects pnpm; add only if needed)

## Further Notes

- The `packageManager` field in `package.json` is pinned to `pnpm@10.33.0` with a SHA-512 hash. Corepack enforces this. CI must use `corepack enable` to respect it.
- The `.gitignore` already ignores `.vercel` and `.env*`, which is correct.
- If Vercel's auto-detection fails, add a minimal `vercel.json`: `{ "buildCommand": "pnpm build", "installCommand": "corepack enable && pnpm install --frozen-lockfile" }`
