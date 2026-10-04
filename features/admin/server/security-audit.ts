import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import { LogAction } from './logs-core'
import { writeLog } from './logs'

/** A security event contains a vocabulary item, never a code, hash or token. */
export async function securityAudit(
  payload: Payload,
  actor: User,
  event: string,
  message: string,
  req?: PayloadRequest,
) {
  await writeLog(
    payload,
    actor,
    {
      action: LogAction.AccountSecurityUpdated,
      targetType: 'user',
      targetId: actor.id,
      message,
      metadata: { event },
    },
    req,
  )
}
