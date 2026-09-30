import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ThemeSwitcher from './theme-switcher'

const setTheme = vi.fn()

// Mutable so each test can set the stored theme *before* the component mounts:
// `active` is only computed once `mounted` flips true, so a one-shot mock value
// would be spent on the first render and lost on the second.
const stored = { theme: 'light', resolvedTheme: 'light' }

vi.mock('next-themes', () => ({
  useTheme: () => ({ ...stored, setTheme }),
}))

const options = ['نظام', 'فاتح', 'داكن']

describe('ThemeSwitcher', () => {
  afterEach(() => {
    stored.theme = 'light'
    stored.resolvedTheme = 'light'
  })

  it('offers system alongside the two explicit themes', () => {
    render(<ThemeSwitcher />)

    for (const label of options) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('marks `system` active when that is what is stored', () => {
    stored.theme = 'system'
    stored.resolvedTheme = 'dark'
    render(<ThemeSwitcher />)

    // `resolvedTheme` is already `dark` here — the group must still point at
    // the *choice*, otherwise following the OS looks like nothing is selected.
    expect(screen.getByRole('button', { name: 'نظام' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'داكن' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('persists the choice the user pressed', async () => {
    setTheme.mockClear()
    render(<ThemeSwitcher />)

    await userEvent.click(screen.getByRole('button', { name: 'داكن' }))

    expect(setTheme).toHaveBeenCalledWith('dark')
  })
})
