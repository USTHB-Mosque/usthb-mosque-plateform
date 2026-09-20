import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FrontendError from './error'

describe('app/(frontend)/error.tsx', () => {
  it('renders the Arabic error message with a retry button', () => {
    render(<FrontendError error={new Error('boom')} reset={() => {}} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('حدث خطأ')
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
  })

  it('logs the error and calls reset when the retry button is clicked', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const reset = vi.fn()
    const user = userEvent.setup()
    const error = new Error('boom')

    render(<FrontendError error={error} reset={reset} />)
    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))

    expect(reset).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalledWith('Frontend segment error:', error)
  })
})
