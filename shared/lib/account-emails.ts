import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import { resolveRelationId } from './relations'

const primaryChanges = new WeakSet<PayloadRequest>()

export function allowPrimaryEmailChange(req: PayloadRequest) {
  primaryChanges.add(req)
}

export function isPrimaryEmailChangeAllowed(req: PayloadRequest) {
  return primaryChanges.has(req)
}

export async function lockAccountEmail(payload: Payload, address: string, req: PayloadRequest) {
  const transactionId = await req.transactionID
  if (!transactionId) throw new Error('Email ownership requires a database transaction')
  const adapter = payload.db as unknown as PostgresAdapter
  await adapter.execute({
    db: adapter.sessions[transactionId].db,
    sql: sql`SELECT pg_advisory_xact_lock(146, hashtext(${address}))`,
  })
}

export async function reserveAccountEmail(
  payload: Payload,
  userId: number,
  address: string,
  req: PayloadRequest,
  pending: boolean,
) {
  await lockAccountEmail(payload, address, req)
  const result = await payload.find({
    collection: 'account-emails',
    where: { address: { equals: address } },
    limit: 1,
    depth: 0,
    req,
  })
  const existing = result.docs[0]
  if (existing) {
    if (Number(resolveRelationId(existing.user)) === userId) {
      if (
        existing.pendingUntil &&
        (!pending || new Date(existing.pendingUntil).getTime() <= Date.now())
      ) {
        return payload.update({
          collection: 'account-emails',
          id: existing.id,
          data: {
            pendingUntil: pending ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
          },
          req,
        })
      }
      return existing
    }
    if (
      existing.pendingUntil &&
      !existing.verifiedAt &&
      new Date(existing.pendingUntil).getTime() <= Date.now()
    ) {
      await payload.delete({ collection: 'account-emails', id: existing.id, req })
    } else throw new Error('البريد الإلكتروني غير متاح')
  }
  return payload.create({
    collection: 'account-emails',
    data: {
      user: userId,
      address,
      verifiedAt: null,
      pendingUntil: pending ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
    },
    req,
  })
}

export async function syncPrimaryEmail({
  doc,
  previousDoc,
  operation,
  req,
}: {
  doc: User
  previousDoc?: User
  operation: 'create' | 'update'
  req: PayloadRequest
}) {
  if (operation === 'create' || doc.email !== previousDoc?.email) {
    await reserveAccountEmail(req.payload, doc.id, doc.email.toLowerCase().trim(), req, false)
  }
  return doc
}

export async function markEmailVerified(
  payload: Payload,
  userId: number,
  address: string,
  req: PayloadRequest,
) {
  await lockAccountEmail(payload, address, req)
  const result = await payload.find({
    collection: 'account-emails',
    where: { and: [{ user: { equals: userId } }, { address: { equals: address } }] },
    limit: 1,
    depth: 0,
    req,
  })
  const email = result.docs[0]
  if (!email) throw new Error('البريد غير موجود في حسابك')
  return payload.update({
    collection: 'account-emails',
    id: email.id,
    data: { verifiedAt: new Date().toISOString(), pendingUntil: null },
    req,
  })
}
