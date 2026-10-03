import type { Payload } from 'payload'
import type { Pool } from 'pg'
import { getAdminCtx } from './ctx'

/**
 * The Postgres pool behind Payload, for the admin screens that aggregate in SQL.
 *
 * Aggregations live in raw SQL on purpose (SPEC §7.8: "computed from the DB
 * (Postgres aggregation) - no external service"): the date_trunc / GROUP BY
 * shapes and the indexes that back them are the requirement. Payload's query
 * API cannot express them, so the one place that reaches for the pool is here
 * and every caller gets the same error when the adapter cannot supply it.
 */
export function getPayloadPool(payload: Payload): Pool {
  const pool = (payload.db as unknown as { pool?: Pool }).pool
  if (!pool) throw new Error('تتطلب الإحصائيات قاعدة بيانات بوستغرس')
  return pool
}

/** The same pool, for callers that only need the queries and not the context. */
export async function getAdminPool(): Promise<Pool> {
  const { payload } = await getAdminCtx()
  return getPayloadPool(payload)
}
