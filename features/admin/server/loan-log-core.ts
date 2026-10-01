import type { Payload } from 'payload'
import type { Book, User } from '@/payload-types'
import { writeLog } from './logs'
import type { LogActionValue } from './logs-core'

/**
 * Writes a loan-transition log line, resolving the book title when possible.
 *
 * Deliberately a plain module rather than a `'use server'` file: it is a
 * helper the admin actions share (loan transitions and, since #144, extension
 * decisions), not an action anyone should be able to reach from the client.
 *
 * The title lookup falls through to an empty title rather than failing the
 * transition — losing the book's name from an audit line is never a reason to
 * reject the decision that line is recording.
 */
export async function writeLoanLog(
  payload: Payload,
  user: User,
  loanId: number,
  action: LogActionValue,
  describe: (title: string) => string,
): Promise<void> {
  let title = ''
  try {
    const loan = await payload.findByID({
      collection: 'loans',
      id: Number(loanId),
      depth: 1,
      overrideAccess: false,
      user,
    })
    if (loan && typeof loan.book === 'object' && loan.book && 'title' in loan.book) {
      title = (loan.book as Book).title
    }
  } catch {
    // Fall through with an empty title rather than failing the transition.
  }
  await writeLog(payload, user, {
    action,
    targetType: 'loan',
    targetId: loanId,
    message: describe(title),
  })
}
