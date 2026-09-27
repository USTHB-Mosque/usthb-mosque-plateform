import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The theme bootstrap is an inline <script> rendered into <head> by the root
 * layout. It is only executed if the browser parses it out of server-rendered
 * HTML, so the component must stay a Server Component. A stray 'use client'
 * makes React treat the <script> as a client-rendered element it never runs:
 * the theme applies late (or not at all) and React logs
 * "Encountered a script tag while rendering React component".
 */
describe('ThemeInitScript', () => {
  const source = readFileSync(join(process.cwd(), 'shared/theme-init-script.tsx'), 'utf8')

  it('is not a client component', () => {
    expect(source).not.toMatch(/^\s*['"]use client['"]/m)
  })

  it('still renders the inline script into the head', () => {
    expect(source).toContain('dangerouslySetInnerHTML')
    expect(source).toContain('<script')
  })

  it('applies the theme class before paint', () => {
    // The whole point of the script: set the class on <html> synchronously.
    expect(source).toContain('classList')
    expect(source).toContain("'dark'")
    expect(source).toContain("'light'")
  })
})

describe('RootHtmlShell', () => {
  const source = readFileSync(join(process.cwd(), 'shared/root-html-shell.tsx'), 'utf8')

  it('renders the theme script from the head, not the body', () => {
    const headStart = source.indexOf('<head>')
    const headEnd = source.indexOf('</head>')
    const scriptIndex = source.indexOf('<ThemeInitScript />')

    expect(headStart).toBeGreaterThan(-1)
    expect(scriptIndex).toBeGreaterThan(headStart)
    expect(scriptIndex).toBeLessThan(headEnd)
  })
})
