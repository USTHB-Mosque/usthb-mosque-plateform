import { describe, expect, it } from 'vitest'

import { activityLifecycleStatus } from './activities'
import type { Activity } from '@/payload-types'

const HOUR = 60 * 60 * 1000

const activity = (over: Partial<Activity>): Activity =>
  ({
    id: 1,
    title: 'درس',
    startDate: new Date().toISOString(),
    ...over,
  }) as Activity

describe('activityLifecycleStatus', () => {
  it('reads an activity whose window has closed as مكتمل', () => {
    const status = activityLifecycleStatus(
      activity({
        startDate: new Date(Date.now() - 10 * HOUR).toISOString(),
        endDate: new Date(Date.now() - HOUR).toISOString(),
      }),
    )

    expect(status.label).toBe('مكتمل')
  })

  it('reads an open-for-registration activity as قائم even once it has started', () => {
    const status = activityLifecycleStatus(
      activity({
        startDate: new Date(Date.now() - HOUR).toISOString(),
        openForRegistration: true,
      }),
    )

    expect(status.label).toBe('قائم')
  })

  it('reads a started activity that has not ended as قائم', () => {
    const status = activityLifecycleStatus(
      activity({
        startDate: new Date(Date.now() - HOUR).toISOString(),
        endDate: new Date(Date.now() + 5 * HOUR).toISOString(),
        openForRegistration: false,
      }),
    )

    expect(status.label).toBe('قائم')
  })

  it('reads an activity that has not started as قادم', () => {
    const status = activityLifecycleStatus(
      activity({
        startDate: new Date(Date.now() + 5 * HOUR).toISOString(),
        endDate: new Date(Date.now() + 6 * HOUR).toISOString(),
        openForRegistration: false,
      }),
    )

    expect(status.label).toBe('قادم')
  })

  it('gives every state a label and a bed, so no caller has to supply its own', () => {
    // The admin table used to carry this mapping inline; #65 asks for one place
    // that owns it, and a state without a colour would reintroduce the drift.
    for (const over of [
      {},
      { startDate: new Date(Date.now() - 10 * HOUR).toISOString() },
      { openForRegistration: true },
    ]) {
      const status = activityLifecycleStatus(activity(over))
      expect(status.label).toBeTruthy()
      expect(status.className).toBeTruthy()
    }
  })

  it('never calls an ongoing activity مكتمل, however old it is', () => {
    // `activityEndTime` gives an `ongoing` activity no deadline, so the window
    // can never close and the word مكتمل is unreachable for it.
    const status = activityLifecycleStatus(
      activity({
        kind: 'ongoing',
        startDate: new Date(Date.now() - 365 * 24 * HOUR).toISOString(),
        openForRegistration: false,
      }),
    )

    expect(status.label).toBe('قائم')
  })
})
