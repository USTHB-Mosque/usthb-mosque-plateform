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

  it('treats a stored "system" as "follow the OS", not as a colour', () => {
    // next-themes writes the literal string "system" once the `نظام` option is
    // picked (and it is the provider's own default). The previous
    // `t ? t==='dark' : matchMedia` read any non-empty value as a theme, so
    // those users were pinned to light on portal and admin.
    expect(source).toContain("t==='dark'")
    expect(source).toContain("t!=='light'")
    expect(source).toContain("matchMedia('(prefers-color-scheme: dark)')")
  })

  it('keeps the OS lookup behind the portal/admin gate', () => {
    // A visitor path takes the `: false` arm, so it never consults the
    // preference at all — visitor pages stay light whatever the OS says.
    expect(source).toMatch(/\(portal\|\|admin\)\?\(t==='dark'/)
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
