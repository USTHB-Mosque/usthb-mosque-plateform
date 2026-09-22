import { describe, expect, it } from 'vitest'
import { getHealthState } from '@/app/(frontend)/api/health/route'

describe('getHealthState', () => {
  it('reports ok and a db latency when the database answers', async () => {
    const state = await getHealthState(async () => undefined)

    expect(state.status).toBe('ok')
    expect(state.db).toBe('up')
    expect(state.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('reports not ok with an error message when the database is unreachable', async () => {
    const state = await getHealthState(async () => {
      throw new Error('connection refused')
    })

    expect(state.status).toBe('error')
    expect(state.db).toBe('down')
    expect(state.error).toBe('connection refused')
  })
})
