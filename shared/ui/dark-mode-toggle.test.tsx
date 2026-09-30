import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import DarkModeToggle from './dark-mode-toggle'

const setTheme = vi.fn()

// Both are supplied because that is the real state on the client at hydration
// time: `theme` comes from localStorage and `resolvedTheme` folds in the system
// preference. The server can see neither.
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', resolvedTheme: 'dark', setTheme }),
}))

describe('DarkModeToggle', () => {
  it('does not let the resolved theme leak into the server markup', () => {
    const html = renderToString(<DarkModeToggle />)

    // React only diffs the *first* client render against this. If `aria-label`
    // or `aria-pressed` is derived from useTheme() before mount, the client
    // resolves the theme earlier than the server and hydration mismatches.
    expect(html).toContain('aria-label="تفعيل الوضع الداكن"')
    expect(html).toContain('aria-pressed="false"')
  })

  it('reports dark once mounted', () => {
    render(<DarkModeToggle />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'إيقاف الوضع الداكن')
  })

  it('switches back to light when pressed', async () => {
    setTheme.mockClear()
    render(<DarkModeToggle />)
    await userEvent.click(screen.getByRole('button'))

    expect(setTheme).toHaveBeenCalledWith('light')
  })
})
