import { render } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import ThemeScopeGuard from './theme-scope-guard'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light' }),
}))

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 50))

describe('ThemeScopeGuard', () => {
  it('enforces light on a visitor page', async () => {
    render(<ThemeScopeGuard />)
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('reverts a dark write and then stops mutating', async () => {
    const html = document.documentElement
    html.classList.remove('light', 'dark')
    render(<ThemeScopeGuard />)
    expect(html.classList.contains('light')).toBe(true)

    let mutations = 0
    const counter = new MutationObserver(() => {
      mutations += 1
    })
    counter.observe(html, { attributes: true, attributeFilter: ['class'] })

    html.classList.add('dark')
    await settle()
    expect(html.classList.contains('light')).toBe(true)
    expect(html.classList.contains('dark')).toBe(false)

    const settledAt = mutations
    html.classList.add('dark')
    await settle()
    expect(html.classList.contains('light')).toBe(true)

    const afterSecondWrite = mutations
    expect(afterSecondWrite).toBeGreaterThan(settledAt)
    await settle()
    expect(mutations).toBe(afterSecondWrite)
    counter.disconnect()
  })
})
