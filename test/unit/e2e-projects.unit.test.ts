import type { Project } from '@playwright/test'
import { describe, expect, it } from 'vitest'

import { buildProjects } from '@/e2e/lib/projects'

// Names and dependency edges are what make the suite correct, so they are
// asserted by name: a dangling `dependencies` entry makes Playwright refuse to
// start, and a dropped project silently changes what CI covers.
const names = (projects: Project[]) => projects.map((project) => project.name)
const dependenciesOf = (projects: Project[], name: string) =>
  projects.find((project) => project.name === name)?.dependencies

describe('buildProjects', () => {
  it('runs every project, in dependency order, when nothing is skipped', () => {
    const projects = buildProjects({ skipVisual: false })

    expect(names(projects)).toEqual(['setup', 'visual', 'chromium', 'webkit'])
    expect(dependenciesOf(projects, 'visual')).toEqual(['setup'])
    expect(dependenciesOf(projects, 'chromium')).toEqual(['setup', 'visual'])
    expect(dependenciesOf(projects, 'webkit')).toEqual(['setup'])
  })

  it('drops the visual project and its edge when visual is skipped', () => {
    const projects = buildProjects({ skipVisual: true })

    expect(names(projects)).toEqual(['setup', 'chromium', 'webkit'])
    // Leaving `visual` in the dependency list would point at a project that no
    // longer exists.
    expect(dependenciesOf(projects, 'chromium')).toEqual(['setup'])
    expect(projects.every((project) => !JSON.stringify(project).includes('visual'))).toBe(true)
  })

  it('scopes every surviving project to its own specs', () => {
    const projects = buildProjects({ skipVisual: true })
    const byName = new Map(projects.map((project) => [project.name, project]))

    expect(byName.get('setup')?.testMatch?.toString()).toContain('auth')
    // The journey project must not pick up the visual baselines.
    expect(byName.get('chromium')?.testIgnore?.toString()).toContain('visual')
    // WebKit stays the core smoke subset, not a second full run.
    expect(byName.get('webkit')?.testMatch?.toString()).toContain('core')
  })

  it('keeps a fresh copy per call so callers cannot mutate a shared plan', () => {
    const first = buildProjects({ skipVisual: false })
    const second = buildProjects({ skipVisual: false })

    expect(first).not.toBe(second)
    expect(first[0]).not.toBe(second[0])
    expect(first).toEqual(second)
  })
})
