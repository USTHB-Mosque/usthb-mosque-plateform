import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MemberPortalError from './error'

describe('app/member-portal/error.tsx', () => {
  it('renders the Arabic error message with a retry button', () => {
    render(<MemberPortalError error={new Error('boom')} reset={() => {}} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('حدث خطأ')
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
  })

  it('logs the error and calls reset when the retry button is clicked', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const reset = vi.fn()
    const user = userEvent.setup()
    const error = new Error('boom')

    render(<MemberPortalError error={error} reset={reset} />)
    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))

    expect(reset).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalledWith('Member portal segment error:', error)
  })
})
