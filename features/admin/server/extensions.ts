'use server'

import { revalidatePath } from 'next/cache'
import { getAdminCtx } from './ctx'
import { writeLoanLog } from './loan-log-core'
import { LogAction } from './logs-core'
import { decideLoanExtension } from '@/features/library'
import { resolveRelationId } from '@/shared/lib/relations'
import type { LoanExtension } from '@/payload-types'

export type ExtensionStatus = 'pending' | 'approved' | 'refused' | 'withdrawn'

export interface AdminExtensionsParams {
  status?: ExtensionStatus
  page?: number
  limit?: number
}

export interface AdminExtensionsPage {
  docs: LoanExtension[]
  page: number
  totalPages: number
  totalDocs: number
}

const revalidateExtensionQueue = () => {
  revalidatePath('/admin-panel/loans/extensions')
  revalidatePath('/admin-panel/dashboard')
}

/**
 * The extension queue (#144): one tab per decision state, newest first.
 *
 * The decision itself is not implemented here — `decideLoanExtension` in the
 * library feature owns the transition (it refuses non-admins, moves the due
 * date on approval and records both dates). This module is the admin surface
 * over it: the listing, the audit line the library side does not write, and
 * the cache invalidation for a screen the library feature knows nothing about.
 *
 * No free-text search: a queue is bounded by the members who asked, so the
 * tabs and the page number are the whole navigation the screen needs.
 */
export async function getAdminExtensions(
  params: AdminExtensionsParams = {},
): Promise<AdminExtensionsPage> {
  const ctx = await getAdminCtx()
  const status: ExtensionStatus = params.status ?? 'pending'
  const page = Math.max(1, Math.trunc(params.page ?? 1))
  const limit = Math.max(1, Math.trunc(params.limit ?? 20))

  // depth 2: extension -> loan -> book, so the row can name the title.
  const result = await ctx.payload.find({
    collection: 'loan-extensions',
    where: { status: { equals: status } },
    sort: '-createdAt',
    page,
    limit,
    depth: 2,
    overrideAccess: false,
    user: ctx.user,
  })

  return {
    docs: result.docs as LoanExtension[],
    page,
    totalPages: result.totalPages,
    totalDocs: result.totalDocs,
  }
}

export interface ExtensionDecisionResult {
  ok: boolean
  error?: string
}

/**
 * Reads the extension's loan first: a decision is audited against the loan it
 * belongs to, so the member's own timeline picks the line up through their
 * books (`targetType: 'loan'`) exactly the way every other line about a loan
 * does. `ExtensionApproved` / `ExtensionRefused` were declared for exactly
 * this and nothing had ever written them (#165 found them unreachable).
 */
async function runExtensionDecision(
  extensionId: number,
  decision: 'approved' | 'refused',
  adminResponse?: string,
): Promise<ExtensionDecisionResult> {
  const ctx = await getAdminCtx()

  let loanId: number
  try {
    const extension = await ctx.payload.findByID({
      collection: 'loan-extensions',
      id: Number(extensionId),
      depth: 0,
      overrideAccess: false,
      user: ctx.user,
    })
    loanId = resolveRelationId(extension.loan)
  } catch {
    return { ok: false, error: 'طلب التمديد غير موجود' }
  }

  const result = await decideLoanExtension(extensionId, decision, adminResponse)
  if (!result.success) return { ok: false, error: result.message }

  await writeLoanLog(
    ctx.payload,
    ctx.user,
    loanId,
    decision === 'approved' ? LogAction.ExtensionApproved : LogAction.ExtensionRefused,
    (title) =>
      decision === 'approved'
        ? `قبل تمديد ميعاد الإرجاع: ${title}`
        : `رفض تمديد ميعاد الإرجاع: ${title}`,
  )

  revalidateExtensionQueue()
  return { ok: true }
}

export async function approveExtension(extensionId: number): Promise<ExtensionDecisionResult> {
  return runExtensionDecision(extensionId, 'approved')
}

export async function refuseExtension(
  extensionId: number,
  reason?: string,
): Promise<ExtensionDecisionResult> {
  return runExtensionDecision(extensionId, 'refused', reason)
}
