import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { ActivityLogEvent, ActivityLogPage } from '@/features/profile/server/activity-log'
import ActivityLogTimeline from './ActivityLogTimeline'

/** Fixed clock: the relative wording depends on it, the assertions must not. */
const NOW = new Date('2026-09-30T12:00:00.000Z')

function event(overrides: Partial<ActivityLogEvent> = {}): ActivityLogEvent {
  return {
    id: `event-${Math.random()}`,
    timestamp: '2026-09-30T11:00:00.000Z',
    source: 'self',
    label: 'طلبت إعارة كتاب',
    ...overrides,
  }
}

function pageData(overrides: Partial<ActivityLogPage> = {}): ActivityLogPage {
  return {
    page: 1,
    totalPages: 1,
    totalDocs: 3,
    groups: [
      {
        dateKey: '2026-09-30',
        label: '30 سبتمبر 2026 (اليوم)',
        isToday: true,
        items: [
          event({
            id: 'log-1',
            source: 'admin',
            label: 'قُبل طلب الإعارة',
            detail: 'الفوائد لابن القيم',
          }),
          event({ id: 'loan-1', label: 'طلبت إعارة كتاب', detail: 'الرحيق المختوم' }),
        ],
      },
      {
        dateKey: '2026-09-28',
        label: '28 سبتمبر 2026',
        isToday: false,
        items: [event({ id: 'log-2', source: 'admin', label: 'تم توثيق حسابك' })],
      },
    ],
    ...overrides,
  }
}

afterEach(cleanup)

describe('ActivityLogTimeline', () => {
  it('renders one section per day with the member-facing labels', () => {
    const { container } = render(<ActivityLogTimeline data={pageData()} now={NOW} />)

    expect(screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)).toEqual([
      '30 سبتمبر 2026 (اليوم)',
      '28 سبتمبر 2026',
    ])
    expect(screen.getByText('قُبل طلب الإعارة')).toBeTruthy()
    expect(screen.getByText('الفوائد لابن القيم')).toBeTruthy()
    expect(screen.getByText('تم توثيق حسابك')).toBeTruthy()

    const times = container.querySelectorAll('time')
    expect(times).toHaveLength(3)
    expect(times[0].getAttribute('datetime')).toBe('2026-09-30T11:00:00.000Z')
    expect(times[0].title).toContain('2026')
    expect(times[0].textContent).toBeTruthy()
  })

  it('marks who caused each event', () => {
    render(<ActivityLogTimeline data={pageData()} now={NOW} />)

    expect(screen.getAllByText('من طرف الإدارة')).toHaveLength(2)
    expect(screen.getAllByText('فعلته أنت')).toHaveLength(1)
  })

  it('keeps the row separator off the last item of each day', () => {
    const { container } = render(<ActivityLogTimeline data={pageData()} now={NOW} />)
    const rows = container.querySelectorAll('li')

    expect(rows[0].className).toContain('border-b')
    expect(rows[1].className).not.toContain('border-b')
    expect(rows[2].className).not.toContain('border-b')
  })

  it('shows a real empty state instead of a bare list', () => {
    const { rerender, container } = render(<ActivityLogTimeline data={null} now={NOW} />)
    expect(screen.getByText('لا توجد أحداث بعد')).toBeTruthy()
    expect(container.querySelectorAll('li')).toHaveLength(0)

    rerender(
      <ActivityLogTimeline
        data={pageData({ groups: [], totalDocs: 0, totalPages: 0 })}
        now={NOW}
      />,
    )
    expect(screen.getByText('لا توجد أحداث بعد')).toBeTruthy()
  })

  it('offers no pager for a single page', () => {
    render(<ActivityLogTimeline data={pageData()} now={NOW} />)
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('links to the adjacent pages and the current one', () => {
    const { rerender } = render(
      <ActivityLogTimeline data={pageData({ page: 1, totalPages: 3, totalDocs: 45 })} now={NOW} />,
    )
    expect(screen.getByRole('navigation')).toBeTruthy()
    expect(screen.queryByText('السابق')).toBeNull()
    expect(screen.getByRole('link', { name: 'التالي' })).toHaveProperty(
      'href',
      'http://localhost:3000/user/activity-log?page=2',
    )

    rerender(
      <ActivityLogTimeline data={pageData({ page: 3, totalPages: 3, totalDocs: 45 })} now={NOW} />,
    )
    expect(screen.queryByText('التالي')).toBeNull()
    expect(screen.getByRole('link', { name: 'السابق' })).toHaveProperty(
      'href',
      'http://localhost:3000/user/activity-log?page=2',
    )
    expect(screen.getByText('3 / 3')).toBeTruthy()
  })
})
