import { devices, type Project } from '@playwright/test'

/**
 * The Playwright project plan, as data.
 *
 * Kept out of `playwright.config.ts` so the ordering and the dependency edges
 * are unit-testable: a `dependencies` entry pointing at a project that is not
 * registered makes Playwright refuse to start, and the `visual` project has to
 * be removable as a unit (project *and* edge) or the journey project keeps
 * pointing at a project that no longer exists.
 *
 * `skipVisual` is the CI opt-out. Visual baselines are host-dependent pixel
 * snapshots — font rasterisation, GPU/skia output and the runner's installed
 * font set all move the pixels — so a GitHub-hosted runner cannot be held to
 * baselines generated on a developer's machine. The suite's real coverage is
 * the behaviour specs; the visual pass stays a local gate (AGENTS.md).
 */
export function buildProjects({ skipVisual }: { skipVisual: boolean }): Project[] {
  const visual: Project = {
    // Visual shots read the untouched seed state, so they run right after
    // setup and before every journey spec that writes to the database.
    name: 'visual',
    testMatch: /visual\.spec\.ts/,
    dependencies: ['setup'],
    use: { ...devices['Desktop Chrome'] },
  }

  const projects: Project[] = [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    ...(skipVisual ? [] : [visual]),
    {
      name: 'chromium',
      testIgnore: /visual\.spec\.ts/,
      dependencies: skipVisual ? ['setup'] : ['setup', 'visual'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // WebKit is the cross-engine smoke subset, not a second full run.
      name: 'webkit',
      testMatch: /core\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Safari'] },
    },
  ]

  return projects
}
