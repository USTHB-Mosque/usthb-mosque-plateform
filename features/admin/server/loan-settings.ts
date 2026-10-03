'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx } from './ctx'
import { writeLog } from './logs'
import { LogAction } from './logs-core'
import { getLoanSettings, type LoanSettings } from '@/shared/lib/settings'
import { MAX_BORROW_LIMIT, MAX_LOAN_DURATION_DAYS } from '@/utils/constants/loans'

export type AdminLoanSettings = LoanSettings

/**
 * #156, SPEC §7.9: loan configuration reachable from the panel.
 *
 * A borrow longer than a term is not a configuration, it is a data-entry slip,
 * and a borrow limit in the dozens stops being a limit and starts being a
 * hoarding — so both are bounded (`MAX_LOAN_DURATION_DAYS`, `MAX_BORROW_LIMIT`).
 *
 * The values were already enforced — `checkRequestGates` reads `borrowLimit` and
 * the loan lifecycle reads `defaultLoanDurationDays`, both through
 * `getLoanSettings` — but they were only editable in the raw Payload admin. The
 * panel now writes the same global through the same reader, so the two cannot
 * drift: there is one source of truth and this screen is a way in, not a copy.
 */

export async function getAdminLoanSettings(): Promise<AdminLoanSettings> {
  const { payload, req } = await getAdminCtx()
  return getLoanSettings(payload, req)
}

export interface LoanSettingsInput {
  defaultLoanDurationDays: number
  borrowLimit: number
}

export interface LoanSettingsResult {
  ok: boolean
  error?: string
}

/**
 * A whole number of days or books inside a sane range. `Number` accepts both a
 * number and the string a form field sends, and turns `null`, `undefined` and
 * `''` into values the range check then rejects — so there is one way in and no
 * type to second-guess at the call site.
 */
function positiveWholeNumber(value: unknown, max: number): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) return null
  return parsed
}

export async function updateAdminLoanSettings(
  input: LoanSettingsInput,
): Promise<LoanSettingsResult> {
  const { payload, user, req } = await getAdminCtx()

  const defaultLoanDurationDays = positiveWholeNumber(
    input.defaultLoanDurationDays,
    MAX_LOAN_DURATION_DAYS,
  )
  const borrowLimit = positiveWholeNumber(input.borrowLimit, MAX_BORROW_LIMIT)

  if (defaultLoanDurationDays === null) {
    return {
      ok: false,
      error: `مدة الإعارة يجب أن تكون يوماً كاملاً بين 1 و ${MAX_LOAN_DURATION_DAYS}`,
    }
  }
  if (borrowLimit === null) {
    return { ok: false, error: `الحد الأقصى للكتب يجب أن يكون بين 1 و ${MAX_BORROW_LIMIT}` }
  }

  const before = await getLoanSettings(payload, req)

  await payload.updateGlobal({
    slug: 'settings',
    data: { defaultLoanDurationDays, borrowLimit },
    req,
    // `settings.update` is admin-only and the ctx is an admin's, so the rule is
    // enforced rather than bypassed.
    overrideAccess: false,
  })

  await writeLog(payload, user, {
    action: LogAction.LoanSettingsUpdated,
    targetType: 'settings',
    targetId: 'settings',
    message: `عدّل إعدادات الإعارة: المدة ${before.defaultLoanDurationDays} ← ${defaultLoanDurationDays} يوماً، الحد ${before.borrowLimit} ← ${borrowLimit} كتاباً`,
    metadata: {
      before: {
        defaultLoanDurationDays: before.defaultLoanDurationDays,
        borrowLimit: before.borrowLimit,
      },
      after: { defaultLoanDurationDays, borrowLimit },
    },
  })

  revalidatePath('/admin-panel/settings/loans')
  // The enforcement reads are not cached per path, but every screen that shows
  // a loan budget should re-read rather than serve a stale limit.
  revalidatePath('/admin-panel/loans')
  revalidatePath('/admin-panel/settings')
  return { ok: true }
}
