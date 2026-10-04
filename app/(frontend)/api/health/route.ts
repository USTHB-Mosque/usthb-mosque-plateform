import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import configPromise from '@payload-config'

export interface HealthState {
  status: 'ok' | 'error'
  db: 'up' | 'down'
  latencyMs?: number
  error?: string
  timestamp: string
  uptime: number
}

/**
 * Probes the database with a trivial query and reports whether it answered.
 * Split from the route handler so the probe can be unit tested without a
 * running Payload instance.
 */
export async function getHealthState(probe: () => Promise<unknown>): Promise<HealthState> {
  const base = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }

  const start = performance.now()

  try {
    await probe()
    return {
      ...base,
      status: 'ok',
      db: 'up',
      latencyMs: Math.round(performance.now() - start),
    }
  } catch (error) {
    return {
      ...base,
      status: 'error',
      db: 'down',
      latencyMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function GET() {
  const probe = async () => {
    const payload = await getPayload({ config: configPromise })
    // Administrative operation: no user passed, intentional bypass. A trivial
    // read is enough to prove the database answers.
    await payload.find({ collection: 'users', limit: 1, depth: 0 })
  }

  const health = await getHealthState(probe)

  if (health.status !== 'ok') {
    // Detail goes to server logs only; the response body stays generic so the
    // unauthenticated endpoint does not disclose database internals.
    console.error('[health] database check failed:', health.error)
  }

  const body: HealthState = { ...health, error: health.error ? 'database unavailable' : undefined }

  return NextResponse.json(body, { status: health.status === 'ok' ? 200 : 503 })
}
