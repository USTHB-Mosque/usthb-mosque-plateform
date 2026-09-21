import { describe, expect, it } from 'vitest'

import { cn } from '@/shared/lib/utils'

describe('cn', () => {
  it('joins class names and resolves tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('px-2', false && 'hidden', 'text-sm')).toBe('px-2 text-sm')
    expect(cn()).toBe('')
  })
})
