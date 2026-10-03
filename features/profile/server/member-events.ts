import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'
import { resolveRelationId } from '@/shared/lib/relations'
import { MemberEventAction, type MemberEventTargetType } from '@/collections/MemberEvent'

export type MemberEventActionValue = (typeof MemberEventAction)[keyof typeof MemberEventAction]

export interface MemberEventTarget {
  type: MemberEventTargetType
  id: number
}

export interface MemberEventInput {
  user: number
  action: MemberEventActionValue
  targetType: MemberEventTargetType
  targetId: number
  timestamp: string
}

/**
 * Append-only writer for the member's own timeline (#178) — the mirror of the
 * admin side's `writeLog`. Called from `afterChange` hooks on the seven source
 * collections; `req` keeps the event on the caller's transaction so a rolled
 * back action takes its event with it.
 *
 * The write is a deliberate `overrideAccess` bypass: the collection denies
 * `create` to every caller because the hook is the only author.
 *
 * Unresolvable owners or targets are skipped, not thrown: the timeline is a
 * best-effort companion to the action, never a reason to fail it. (A resolver
 * that reads back a referenced row — the extension hook's loan lookup — can
 * still throw when that row is truly gone, but the FK on the source row makes
 * that unreachable in practice.)
 */
export async function recordMemberEvent(
  req: PayloadRequest,
  input: MemberEventInput,
): Promise<void> {
  if (!Number.isFinite(input.user) || !Number.isFinite(input.targetId)) return
  await req.payload.create({
    collection: 'member-events',
    data: {
      user: input.user,
      action: input.action,
      targetType: input.targetType,
      targetId: String(input.targetId),
      timestamp: input.timestamp,
    },
    req,
    overrideAccess: true,
  })
}

/**
 * Builds the `afterChange` hook one source collection attaches: on create, the
 * row's owner and content target become one immutable event. The target is
 * resolved at write time into a `book` / `activity` / `article` reference so
 * titles stay resolvable after the source row itself is gone (#178).
 */
export function memberEventOnCreate(
  action: MemberEventActionValue,
  resolveTarget: (doc: any, req: PayloadRequest) => MemberEventTarget | Promise<MemberEventTarget>,
): CollectionAfterChangeHook {
  return async ({ doc, operation, req }) => {
    if (operation !== 'create') return doc
    const target = await resolveTarget(doc, req)
    await recordMemberEvent(req, {
      user: resolveRelationId(doc.user),
      action,
      targetType: target.type,
      targetId: target.id,
      // The event is dated when the row was created — the same instant the
      // derived timeline used to read off `createdAt` (#165).
      timestamp: doc.createdAt,
    })
    return doc
  }
}
