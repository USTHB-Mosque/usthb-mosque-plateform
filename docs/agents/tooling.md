# Agent tooling: what is kept, and why

Committed per #94 (Phase 0). Everything in the old agent/tooling inventory is
either deleted or documented here as intentionally kept.

## Deleted

| Path                                         | Why                                                                                                                     |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `.agents/skills/playwright-cli`              | Contradicted #96, which drops Playwright.                                                                               |
| `.agents/skills/vercel-react-best-practices` | Vercel-specific guidance; contradicts the self-hosting decision (see `docs/adr/0002-self-hosted-docker-deployment.md`). |
| `.scratch/`                                  | Leftover scratch directory. `.scratch/` is gitignored now.                                                              |
| `.playwright/`                               | Playwright config with zero tests; Playwright dependency removed per #96.                                               |

## Kept

| Path                                                             | What it is                                                    | Note                                                                                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.agents/skills/` (grill-me, improve-codebase-architecture, tdd) | Vendored engineering skills from `mattpocock/skills`          | Kept and used in this repo's workflow (`/tdd` at test seams, `/grill-me` for spec sharpening). Managed by `skills-lock.json`.                                                      |
| `skills-lock.json`                                               | Lockfile for the vendored skills above                        | Update hashes when re-vendoring.                                                                                                                                                   |
| `opencode.json`                                                  | OpenCode editor config                                        | The team uses OpenCode. The Figma MCP server inside it requires a `FIGMA_PAT` environment variable; without it the Figma MCP simply fails to start and the rest of OpenCode works. |
| `.mcp.json`                                                      | `next-devtools` MCP server config                             | Used during development for Next.js runtime diagnostics.                                                                                                                           |
| `docs/agents/`                                                   | Agent conventions (issue tracker, triage labels, domain docs) | Genuinely useful; all five canonical triage labels now exist on the repo.                                                                                                          |

## Local settings

Personal/local agent settings (anything ending in `.local.json`, e.g. an
editor's `settings.local.json`) belong to the developer, not the repo —
`*.local.json` is gitignored. The repo itself carries no `.claude/` or similar
directory; the committed agent tooling is `opencode.json` and `.mcp.json`
(documented above).
