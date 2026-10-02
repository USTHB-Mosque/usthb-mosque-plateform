import { describe, expect, it, vi } from 'vitest'
import { ActivityRegistrations } from './ActivityRegistrations'

type HookArgs = Record<string, unknown>

const beforeChange = ActivityRegistrations.hooks?.beforeChange?.[0] as (
  args: HookArgs,
) => Promise<Record<string, unknown>>
const afterDelete = ActivityRegistrations.hooks?.afterDelete?.[0] as (
  args: HookArgs,
) => Promise<unknown>

const member = { id: 7, role: 'user' }

describe('ActivityRegistrations hooks against a document with no stored values', () => {
  it('refuses to auto-complete a registration that carries no previous status', async () => {
    await expect(
      beforeChange({
        data: { status: 'completed' },
        operation: 'update',
        req: { user: member },
        originalDoc: { status: null },
        context: { completeActivity: true },
      }),
    ).rejects.toThrow('لا يمكن تغيير قرار التسجيل')
  })

  it('never drives the participant counter below zero', async () => {
    const update = vi.fn().mockResolvedValue({ id: 3 })
    const doc = await afterDelete({
      doc: { id: 1, status: 'accepted', activity: 3 },
      req: {
        payload: {
          findByID: vi.fn().mockResolvedValue({ id: 3, currentParticipants: null }),
          update,
        },
      },
    })

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { currentParticipants: 0 } }),
    )
    expect(doc).toMatchObject({ id: 1 })
  })
})
