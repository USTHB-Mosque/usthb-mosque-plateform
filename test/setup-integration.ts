import { vi } from 'vitest'
import type { Payload } from 'payload'
import { createLocalReq } from 'payload'

import type { User } from '@/payload-types'
import { truncateAll } from './lib/db'

vi.mock('@/payload.config', async () => ({
  default: (await import('./payload-test.config')).default,
}))

import './lib/next-stubs'

let cachedPayload: Payload | null = null

/** Boots a real Payload against the scratch database, running migrations once. */
export async function getTestPayload(): Promise<Payload> {
  if (cachedPayload) return cachedPayload
  const { getPayload } = await import('payload')
  const config = (await import('./payload-test.config')).default
  cachedPayload = await getPayload({ config })
  return cachedPayload
}

export { truncateAll }

export async function resetDatabase(): Promise<void> {
  const payload = await getTestPayload()
  await truncateAll(payload)
}

/**
 * A request bound to a user, for Local API calls with `overrideAccess: false` —
 * the same shape server actions get from `getPayloadWithUser`.
 */
export async function boundReq(payload: Payload, user?: User): Promise<any> {
  return createLocalReq({ user }, payload)
}
