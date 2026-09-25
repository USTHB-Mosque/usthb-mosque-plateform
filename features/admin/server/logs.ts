'use server'

import type { Payload, Where } from 'payload'
import type { User } from '@/payload-types'
import { getAdminCtx } from './ctx'
import { groupLogsByDay, type LogActionValue, type LogInput, type LogsQuery } from './logs-core'

/**
 * Append-only writer used by the admin server actions. Log lines are
 * composed at the call site so the human-readable `message` mirrors the
 * screen wording (#103 example: "عبدالرحمن أضاف كتاباً: الفوائد ...").
 */
export async function writeLog(payload: Payload, user: User, input: LogInput): Promise<void> {
  await payload.create({
    collection: 'logs',
    data: {
      actor: user.id,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId == null ? undefined : String(input.targetId),
      timestamp: new Date().toISOString(),
      message: input.message,
      metadata: input.metadata,
    },
    overrideAccess: false,
    user,
  })
}

export async function getAdminLogs(query: LogsQuery = {}) {
  const { payload, user } = await getAdminCtx()

  const andFilters: Where[] = []
  if (query.actor) andFilters.push({ actor: { equals: query.actor } })
  if (query.action) andFilters.push({ action: { equals: query.action } })
  if (query.from) andFilters.push({ timestamp: { greater_than_equal: new Date(query.from) } })
  if (query.to) andFilters.push({ timestamp: { less_than_equal: new Date(query.to) } })

  const result = await payload.find({
    collection: 'logs',
    where: andFilters.length ? { and: andFilters } : {},
    sort: '-timestamp',
    depth: 1,
    page: query.page || 1,
    limit: query.limit || 50,
    overrideAccess: false,
    user,
  })

  return {
    logs: result.docs,
    groups: groupLogsByDay(result.docs),
    page: result.page,
    totalPages: result.totalPages,
    totalDocs: result.totalDocs,
    hasNextPage: result.hasNextPage,
    hasPrevPage: result.hasPrevPage,
  }
}
