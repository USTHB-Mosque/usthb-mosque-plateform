import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ActivityFeedbackPanel from './ActivityFeedbackPanel'

const submit = vi.fn()
vi.mock('../server/feedback', () => ({
  leaveActivityFeedback: (...args: unknown[]) => submit(...args),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

describe('Activity feedback screen', () => {
  beforeEach(() => submit.mockReset())

  it('shows aggregate and permits an attended member to revise sentiment', async () => {
    submit.mockResolvedValue({ ok: true })
    render(
      <ActivityFeedbackPanel
        activityId={7}
        positive={3}
        negative={1}
        canLeaveFeedback
        initialSentiment="positive"
      />,
    )
    expect(screen.getByText('3 إيجابي')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'سلبي' }))
    fireEvent.click(screen.getByRole('button', { name: 'تحديث التقييم' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith(7, 'negative', ''))
  })

  it('only shows aggregate to members not eligible to review yet', () => {
    render(
      <ActivityFeedbackPanel activityId={7} positive={3} negative={1} canLeaveFeedback={false} />,
    )
    expect(screen.getByText('1 سلبي')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'إرسال التقييم' })).not.toBeInTheDocument()
  })
})
