import type { Project } from '@playwright/test'
import { describe, expect, it } from 'vitest'

import { buildProjects } from '@/e2e/lib/projects'

// Names and dependency edges are what make the suite correct, so they are
// asserted by name: a dangling `dependencies` entry makes Playwright refuse to
// start, and a dropped project silently changes what CI covers.
const names = (projects: Project[]) => projects.map((project) => project.name)
const project = (projects: Project[], name: string) =>
  projects.find((candidate) => candidate.name === name)

describe('buildProjects', () => {
  it('runs every project, in dependency order, when nothing is skipped', () => {
    const projects = buildProjects({ skipVisual: false })

    expect(names(projects)).toEqual(['setup', 'visual', 'chromium', 'webkit'])
    expect(project(projects, 'visual')?.dependencies).toEqual(['setup'])
    expect(project(projects, 'chromium')?.dependencies).toEqual(['setup', 'visual'])
    expect(project(projects, 'webkit')?.dependencies).toEqual(['setup'])
  })

  it('drops the visual project and its edge when visual is skipped', () => {
    const projects = buildProjects({ skipVisual: true })

    expect(names(projects)).toEqual(['setup', 'chromium', 'webkit'])
    // Leaving `visual` in this list would point at a project that no longer
    // exists, and Playwright refuses to start on a dangling dependency.
    expect(project(projects, 'chromium')?.dependencies).toEqual(['setup'])
    // The journey project must keep ignoring the visual spec, which has no
    // baselines on the runner and would otherwise be collected into it.
    expect(project(projects, 'chromium')?.testIgnore).toEqual(/visual\.spec\.ts/)
  })

  it('scopes every project to its own specs', () => {
    const projects = buildProjects({ skipVisual: false })

    expect(project(projects, 'setup')?.testMatch).toEqual(/auth\.setup\.ts/)
    expect(project(projects, 'visual')?.testMatch).toEqual(/visual\.spec\.ts/)
    expect(project(projects, 'chromium')?.testIgnore).toEqual(/visual\.spec\.ts/)
    // WebKit is the cross-engine smoke subset, not a second full run.
    expect(project(projects, 'webkit')?.testMatch).toEqual(/core\.spec\.ts/)
  })
})
