# 01: Create GitHub Actions CI Workflow

**What to build:** A GitHub Actions workflow that runs `pnpm lint` and `pnpm typecheck` on every PR to `dev` and `main`. Zero secrets required. PR feedback in under 2 minutes.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `.github/workflows/ci.yml` exists
- [ ] Workflow triggers on `pull_request` targeting `dev` and `main` branches
- [ ] Workflow does NOT trigger on push to any branch
- [ ] Steps: checkout, setup pnpm (via `pnpm/action-setup`), setup node with corepack enabled, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`
- [ ] No secrets or environment variables referenced anywhere in the workflow
- [ ] Uses `ubuntu-latest` runner
- [ ] `pnpm` version is derived from `packageManager` field in `package.json` (not hardcoded)
- [ ] Workflow runs successfully on a test PR to `dev`
