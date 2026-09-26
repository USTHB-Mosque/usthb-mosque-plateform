import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MemberPortalNotFound from './not-found'

describe('app/member-portal/not-found.tsx', () => {
  it('renders the Arabic 404 with a link back to the dashboard', () => {
    render(<MemberPortalNotFound />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('الصفحة غير موجودة')
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'العودة إلى لوحة التحكم' })).toHaveAttribute(
      'href',
      '/user/dashboard',
    )
  })
})
