import { describe, expect, it } from 'vitest'

import {
  CANCEL_UNAVAILABLE_MESSAGE,
  EXTENSION_WITHDRAW_UNAVAILABLE_MESSAGE,
  canMemberCancel,
  canWithdrawExtension,
  checkCancelGate,
  checkExtensionWithdrawGate,
} from '@/shared/lib/loan-gates'

/**
 * D6 (#153): cancel is offered only while cancelling leaves the queue no worse
 * off than inaction did. These are the two predicates the member table and the
 * server actions both read, so a change to one is a change to both.
 */
describe('checkCancelGate', () => {
  it("allows cancelling while the request is still the member's to withdraw", () => {
    // `pending` holds no copy; `accepted` holds one that cancelling releases.
    expect(checkCancelGate('pending')).toEqual({ ok: true })
    expect(checkCancelGate('accepted')).toEqual({ ok: true })
  })

  it.each(['picked_up', 'returned', 'refused', 'cancelled', '', 'nonsense'])(
    'refuses a %s loan',
    (status) => {
      expect(checkCancelGate(status)).toEqual({
        ok: false,
        message: CANCEL_UNAVAILABLE_MESSAGE,
      })
    },
  )

  it('refuses an absent status', () => {
    expect(checkCancelGate(null)).toEqual({ ok: false, message: CANCEL_UNAVAILABLE_MESSAGE })
    expect(checkCancelGate(undefined)).toEqual({ ok: false, message: CANCEL_UNAVAILABLE_MESSAGE })
  })

  it('mirrors itself for menu visibility', () => {
    expect(canMemberCancel('pending')).toBe(true)
    expect(canMemberCancel('accepted')).toBe(true)
    expect(canMemberCancel('picked_up')).toBe(false)
    expect(canMemberCancel('cancelled')).toBe(false)
    expect(canMemberCancel(null)).toBe(false)
    expect(canMemberCancel(undefined)).toBe(false)
  })
})

describe('checkExtensionWithdrawGate', () => {
  it('allows withdrawing while nobody has decided yet', () => {
    expect(checkExtensionWithdrawGate('pending')).toEqual({ ok: true })
  })

  it.each(['approved', 'refused', 'withdrawn', '', 'nonsense'])(
    'refuses a %s extension',
    (status) => {
      expect(checkExtensionWithdrawGate(status)).toEqual({
        ok: false,
        message: EXTENSION_WITHDRAW_UNAVAILABLE_MESSAGE,
      })
    },
  )

  it('refuses an absent status', () => {
    expect(checkExtensionWithdrawGate(null)).toEqual({
      ok: false,
      message: EXTENSION_WITHDRAW_UNAVAILABLE_MESSAGE,
    })
    expect(checkExtensionWithdrawGate(undefined)).toEqual({
      ok: false,
      message: EXTENSION_WITHDRAW_UNAVAILABLE_MESSAGE,
    })
  })

  it('mirrors itself for menu visibility', () => {
    expect(canWithdrawExtension('pending')).toBe(true)
    expect(canWithdrawExtension('refused')).toBe(false)
    expect(canWithdrawExtension(null)).toBe(false)
    expect(canWithdrawExtension(undefined)).toBe(false)
  })
})
