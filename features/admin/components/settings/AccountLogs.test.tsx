import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { Log, Media } from '@/payload-types'
import AccountLogs from './AccountLogs'

it('renders own-actor avatars, linked targets and multi-day timeline markers', () => {
  const timestamp = '2026-10-03T12:30:00.000Z'
  const entries: Log[] = [
    {
      id: 1,
      action: 'book_created',
      targetType: 'book',
      targetId: '7',
      message: 'أضاف كتاباً: تفسير السعدي',
      timestamp,
      updatedAt: timestamp,
      createdAt: timestamp,
    },
    {
      id: 2,
      action: 'account_security_updated',
      message: 'غيّر كلمة المرور',
      timestamp: '2026-10-02T10:30:00.000Z',
      updatedAt: timestamp,
      createdAt: timestamp,
    },
  ]
  const profilePicture = {
    id: 3,
    alt: 'المشرف',
    url: '/static/images/login.jpg',
    isPrivate: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies Media
  render(<AccountLogs entries={entries} user={{ fullName: 'محمد الإعدادات', profilePicture }} />)

  expect(screen.getAllByRole('img', { name: 'محمد الإعدادات' })).toHaveLength(2)
  expect(screen.getByRole('link', { name: /تفسير السعدي/ })).toHaveAttribute(
    'href',
    '/admin-panel/library/book/7',
  )
  expect(screen.getAllByTestId('account-log-marker')).toHaveLength(2)
  expect(screen.getByText('غيّر كلمة المرور')).toBeVisible()
})
